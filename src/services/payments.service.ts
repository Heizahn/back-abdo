import {
  /* inject, */ BindingScope,
  Getter,
  inject,
  injectable,
} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import mongoose from 'mongoose';
import {Payments} from '../models/payments.model';
import {PaymentsRepository} from '../repositories/payments.repository';
import {ClientService} from './client.service';
import {UtilsService} from './utils.service';

interface PaymentWithAmount extends Omit<Payments, 'nAmount' | 'nBs'> {
  nAmount: number;
  nBs: number;
}

@injectable({scope: BindingScope.TRANSIENT})
export class PaymentsService {
  constructor(
    @repository(PaymentsRepository)
    private paymentsRepository: PaymentsRepository,

    @inject.getter('services.ClientService')
    private clientService: Getter<ClientService>,

    @inject.getter('services.UtilsService')
    private utilsService: Getter<UtilsService>,
  ) {}

  // Función auxiliar para redondear a 2 decimales
  private roundToTwoDecimals(num: number): number {
    return parseFloat(num.toFixed(2));
  }

  async findByClientId(id: string, idOwner?: string) {
    const utilsService = await this.utilsService();
    await utilsService.validateClientAccess(id, idOwner);

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          idClient: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: 'PartPayments',
          localField: '_id',
          foreignField: 'idPayment',
          as: 'partPayments',
        },
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'idCreator',
          foreignField: '_id',
          as: 'creator',
        },
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'idEditor',
          foreignField: '_id',
          as: 'editor',
        },
      },
      {
        $lookup: {
          from: 'Debts',
          let: {
            partPaymentDebtIds: '$partPayments.idDebt',
            paymentState: '$sState',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {$in: ['$_id', '$$partPaymentDebtIds']},
                    {
                      $or: [
                        {$eq: ['$$paymentState', 'Anulado']},
                        {$eq: ['$sState', 'Activo']},
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                sReason: 1,
                sState: 1,
              },
            },
          ],
          as: 'relatedDebtsInfo',
        },
      },
      {
        $addFields: {
          activeDebts: {
            $filter: {
              input: '$relatedDebtsInfo',
              as: 'debt',
              cond: {$eq: ['$$debt.sState', 'Activo']},
            },
          },
          allDebts: '$relatedDebtsInfo',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          nAmount: 1,
          nBs: 1,
          sCommentary: 1,
          sState: 1,
          creator: {$arrayElemAt: ['$creator.sName', 0]},
          editor: {$arrayElemAt: ['$editor.sName', 0]},
          sReason: {
            $cond: {
              if: {$eq: ['$partPayments', []]},
              then: {
                $concat: [
                  'Abono',
                  {
                    $cond: [{$eq: ['$sState', 'Anulado']}, ' (Anulado)', ''],
                  },
                ],
              },
              else: {
                $cond: {
                  if: {
                    $and: [
                      {$eq: ['$sState', 'Activo']},
                      {$eq: ['$activeDebts', []]},
                    ],
                  },
                  then: 'Abono',
                  else: {
                    $concat: [
                      {
                        $reduce: {
                          input: {
                            $cond: [
                              {$gt: [{$size: '$activeDebts'}, 0]},
                              '$activeDebts.sReason',
                              '$allDebts.sReason',
                            ],
                          },
                          initialValue: '',
                          in: {
                            $cond: {
                              if: {$eq: ['$$value', '']},
                              then: '$$this',
                              else: {$concat: ['$$value', ', ', '$$this']},
                            },
                          },
                        },
                      },
                      {
                        $cond: [
                          {$eq: ['$sState', 'Anulado']},
                          ' (Anulado)',
                          '',
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          dCreation: 1,
          dEdition: 1,
          bUSD: 1,
          bCash: 1,
          sReference: 1,
        },
      },
    ];

    const payments = await this.paymentsRepository.dataSource.connector
      ?.collection('Payments')
      .aggregate(pipeline)
      .toArray();

    return payments.map((payment: PaymentWithAmount) => ({
      ...payment,
      nAmount: this.roundToTwoDecimals(payment.nAmount),
      nBs: this.roundToTwoDecimals(payment.nBs),
    }));
  }

  async createPayment(paymentData: Partial<Payments>, idDebt?: string) {
    try {
      if (!paymentData.nAmount) {
        throw new HttpErrors.BadRequest('El monto del pago es requerido');
      }

      if (!paymentData.idClient) {
        throw new HttpErrors.BadRequest('El ID del cliente es requerido');
      }

      if (!paymentData.idCreator) {
        throw new HttpErrors.BadRequest('El ID del creador es requerido');
      }

      // Redondear los montos
      paymentData.nAmount = this.roundToTwoDecimals(paymentData.nAmount);
      if (paymentData.nBs) {
        paymentData.nBs = this.roundToTwoDecimals(paymentData.nBs);
      }

      const ObjectId = mongoose.Types.ObjectId;
      const paymentsCollection =
        this.paymentsRepository.dataSource.connector?.collection('Payments');
      const debtsCollection =
        this.paymentsRepository.dataSource.connector?.collection('Debts');
      const partPaymentsCollection =
        this.paymentsRepository.dataSource.connector?.collection(
          'PartPayments',
        );

      if (!paymentsCollection || !debtsCollection || !partPaymentsCollection) {
        throw new HttpErrors.InternalServerError(
          'Error al conectar con la base de datos',
        );
      }

      // Crear el pago principal
      const paymentCreated = await this.paymentsRepository.create({
        ...paymentData,
        sState: 'Activo',
        idClient: paymentData.idClient,
        dCreation: new Date().toISOString(),
      });
      console.log('Pago creado:', paymentCreated);

      const clientId = new ObjectId(paymentData.idClient);

      // Función recursiva para procesar pagos
      const processPayment = async (
        amount: number,
        debtId?: string,
      ): Promise<number> => {
        console.log(
          `Procesando pago, monto restante: ${amount}, idDebt: ${debtId ?? 'no especificado'}`,
        );

        // Si no queda monto por asignar, terminamos
        if (amount <= 0) {
          console.log('No queda monto por asignar, finalizando proceso');
          return 0;
        }

        let debtToProcess;

        // Si se especificó un ID de deuda, buscamos esa deuda específica
        if (debtId) {
          debtToProcess = await debtsCollection.findOne({
            _id: new ObjectId(debtId),
            sState: 'Activo',
          });

          if (!debtToProcess) {
            console.log(
              `Deuda con ID ${debtId} no encontrada o no activa, buscando la siguiente más antigua`,
            );
            // Si no se encuentra la deuda especificada, continuamos con la siguiente más antigua
            debtId = undefined;
          }
        }

        // Si no se especificó ID o no se encontró la deuda especificada, buscamos la más antigua con pendiente
        if (!debtId) {
          const oldestDebt = await debtsCollection
            .aggregate([
              {$match: {idClient: clientId, sState: 'Activo'}},
              {
                $lookup: {
                  from: 'PartPayments',
                  let: {debtId: '$_id'},
                  pipeline: [
                    {
                      $match: {
                        $expr: {$eq: ['$idDebt', '$$debtId']},
                      },
                    },
                    {
                      $lookup: {
                        from: 'Payments',
                        localField: 'idPayment',
                        foreignField: '_id',
                        as: 'payment',
                      },
                    },
                    {
                      $match: {
                        'payment.sState': 'Activo',
                      },
                    },
                  ],
                  as: 'partPayments',
                },
              },
              {
                $addFields: {
                  totalPartPayments: {$sum: '$partPayments.nAmount'},
                  pending: {
                    $subtract: ['$nAmount', {$sum: '$partPayments.nAmount'}],
                  },
                },
              },
              {$match: {pending: {$gt: 0}}},
              {$sort: {dCreation: 1}},
              {$limit: 1},
            ])
            .toArray();

          if (oldestDebt.length === 0) {
            console.log('No se encontraron deudas activas con pendiente');
            return amount; // Devolvemos el monto restante sin cambios
          }

          debtToProcess = oldestDebt[0];
        }

        // Calculamos el pendiente real de la deuda
        const partPayments = await partPaymentsCollection
          .aggregate([
            {
              $match: {
                idDebt: debtToProcess._id,
              },
            },
            {
              $lookup: {
                from: 'Payments',
                localField: 'idPayment',
                foreignField: '_id',
                as: 'payment',
              },
            },
            {
              $match: {
                'payment.sState': 'Activo',
              },
            },
          ])
          .toArray();

        const totalPartPayments = partPayments.reduce(
          (sum: number, pp: {nAmount: number}) => sum + pp.nAmount,
          0,
        );

        const pendiente = this.roundToTwoDecimals(
          debtToProcess.nAmount - totalPartPayments,
        );

        console.log(
          `Pendiente real de la deuda ${debtToProcess._id}: ${pendiente}`,
          `(Monto deuda: ${debtToProcess.nAmount}`,
          `- Total partes de pago activas: ${totalPartPayments})`,
        );

        // Si no hay pendiente, pasamos a la siguiente deuda
        if (pendiente <= 0) {
          console.log(
            `La deuda ${debtToProcess._id} ya está pagada, buscando siguiente`,
          );
          return processPayment(amount); // Llamada recursiva sin especificar ID
        }

        // Calculamos cuánto asignar a esta deuda
        const amountToUse = this.roundToTwoDecimals(
          Math.min(amount, pendiente),
        );

        // Creamos la parte de pago
        if (amountToUse > 0) {
          await partPaymentsCollection.insertOne({
            idDebt: debtToProcess._id,
            idPayment: paymentCreated.id,
            nAmount: amountToUse,
          });

          console.log(
            `Parte de pago creada: idDebt=${debtToProcess._id}, amount=${amountToUse}`,
          );

          // Reducimos el monto restante
          const newRemainingAmount = this.roundToTwoDecimals(
            amount - amountToUse,
          );

          // Si todavía queda monto por asignar, continuamos con la siguiente deuda
          if (newRemainingAmount > 0) {
            return processPayment(newRemainingAmount); // Llamada recursiva para la siguiente deuda
          }
        }

        return amount - amountToUse;
      };

      // Iniciamos el proceso con la deuda especificada o buscando la más antigua
      const finalRemainingAmount = await processPayment(
        paymentData.nAmount,
        idDebt,
      );
      console.log(
        `Proceso de pago finalizado. Monto restante sin asignar: ${finalRemainingAmount}`,
      );

      // Actualizamos el balance del cliente
      const clientService = await this.clientService();
      await clientService.updateBalance(paymentData.idClient);

      return {
        success: true,
        message: 'Pago creado correctamente',
      };
    } catch (error) {
      console.error('Error en createPayment:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Error al crear el pago: ${error.message}`,
      );
    }
  }

  async cancelPayment({id, idEditor}: {id: string; idEditor: string}) {
    try {
      const payment = await this.paymentsRepository.findById(id);
      if (!payment) {
        throw new HttpErrors.NotFound('Pago no encontrado');
      }

      if (payment.sState === 'Anulado') {
        throw new HttpErrors.BadRequest('El pago ya está anulado');
      }

      payment.sState = 'Anulado';
      payment.idEditor = idEditor;
      payment.dEdition = new Date().toISOString();
      await this.paymentsRepository.updateById(id, payment);

      const clientService = await this.clientService();
      await clientService.updateBalance(payment.idClient);

      return {
        success: true,
        message: 'Pago anulado correctamente',
      };
    } catch (error) {
      console.error('Error en cancelPayment:', error);
      if (error instanceof HttpErrors.HttpError) {
        throw error;
      }
      throw new HttpErrors.InternalServerError(
        `Error al cancelar el pago: ${error.message}`,
      );
    }
  }

  async findTypePaymentsByClientId(idClient: string, idOwner?: string) {
    const utilsService = await this.utilsService();
    await utilsService.validateClientAccess(idClient, idOwner);

    const ObjectId = mongoose.Types.ObjectId;
    const paymentsCollection =
      this.paymentsRepository.dataSource.connector?.collection('Payments');

    if (!paymentsCollection) {
      throw new HttpErrors.InternalServerError(
        'Error al conectar con la base de datos',
      );
    }

    return paymentsCollection
      .aggregate([
        {
          $match: {
            idClient: new ObjectId(idClient),
            sState: 'Activo',
          },
        },
        {
          $group: {
            _id: {$cond: [{$eq: ['$bUSD', true]}, 'USD', 'VES']},
            count: {
              $sum: 1,
            },
            tipo: {
              $last: {$cond: [{$eq: ['$bUSD', true]}, 'USD', 'VES']},
            },
          },
        },
        {
          $sort: {
            tipo: 1,
          },
        },
      ])
      .toArray();
  }

  async getPaymentsListSimple(idOwner?: string) {
    const pipeline: mongoose.PipelineStage[] = [];
    if (idOwner) {
      pipeline.push({
        $match: {
          idOwner: new mongoose.Types.ObjectId(idOwner),
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'Clients',
          localField: 'idClient',
          foreignField: '_id',
          as: 'client',
        },
      },
      {
        $sort: {
          fecha: -1,
        },
      },
      {$limit: 150},
      {
        $lookup: {
          from: 'Users',
          localField: 'idEditor',
          foreignField: '_id',
          as: 'editor',
        },
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'idCreator',
          foreignField: '_id',
          as: 'creator',
        },
      },
      {
        $lookup: {
          from: 'PartPayments',
          localField: '_id',
          foreignField: 'idPayment',
          as: 'partPayments',
        },
      },
      {
        $lookup: {
          from: 'Debts',
          let: {
            partPaymentDebtIds: '$partPayments.idDebt',
            paymentState: '$sState',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {$in: ['$_id', '$$partPaymentDebtIds']},
                    {
                      $or: [
                        {$eq: ['$$paymentState', 'Anulado']},
                        {$eq: ['$sState', 'Activo']},
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                sReason: 1,
                sState: 1,
              },
            },
          ],
          as: 'relatedDebtsInfo',
        },
      },
      {
        $addFields: {
          activeDebts: {
            $filter: {
              input: '$relatedDebtsInfo',
              as: 'debt',
              cond: {$eq: ['$$debt.sState', 'Activo']},
            },
          },
          allDebts: '$relatedDebtsInfo',
        },
      },
      {
        $addFields: {
          nAmount: '$nAmount',
          nBs: '$nBs',
          client: {
            $last: '$client',
          },
          sReason: {
            $cond: {
              if: {$eq: ['$partPayments', []]},
              then: {
                $concat: [
                  'Abono',
                  {
                    $cond: [{$eq: ['$sState', 'Anulado']}, ' (Anulado)', ''],
                  },
                ],
              },
              else: {
                $cond: {
                  if: {
                    $and: [
                      {$eq: ['$sState', 'Activo']},
                      {$eq: ['$activeDebts', []]},
                    ],
                  },
                  then: 'Abono',
                  else: {
                    $concat: [
                      {
                        $reduce: {
                          input: {
                            $cond: [
                              {$gt: [{$size: '$activeDebts'}, 0]},
                              '$activeDebts.sReason',
                              '$allDebts.sReason',
                            ],
                          },
                          initialValue: '',
                          in: {
                            $cond: {
                              if: {$eq: ['$$value', '']},
                              then: '$$this',
                              else: {$concat: ['$$value', ', ', '$$this']},
                            },
                          },
                        },
                      },
                      {
                        $cond: [
                          {$eq: ['$sState', 'Anulado']},
                          ' (Anulado)',
                          '',
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          sReference: {
            $ifNull: [
              {
                $toString: '$sReference',
              },
              'na',
            ],
          },
          creator: {
            $last: '$creator.sName',
          },
          editor: {
            $ifNull: [
              {
                $last: '$editor.sName',
              },
              '',
            ],
          },
        },
      },
      {
        $addFields: {
          clientName: '$client.sName',
          idClient: '$client._id',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          nAmount: 1,
          nBs: 1,
          clientName: 1,
          idClient: 1,
          sReason: 1,
          sReference: 1,
          bCash: 1,
          creator: 1,
          editor: 1,
          dCreation: 1,
          dEdition: 1,
          sState: 1,
        },
      },
    );

    return this.paymentsRepository.dataSource.connector
      ?.collection('Payments')
      .aggregate(pipeline)
      .toArray();
  }

  async getPaymentsListComplete(idOwner?: string) {
    const pipeline: mongoose.PipelineStage[] = [];
    if (idOwner) {
      pipeline.push({
        $match: {
          idOwner: new mongoose.Types.ObjectId(idOwner),
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'Clients',
          localField: 'idClient',
          foreignField: '_id',
          as: 'client',
        },
      },
      {
        $sort: {
          fecha: -1,
        },
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'idEditor',
          foreignField: '_id',
          as: 'editor',
        },
      },
      {
        $lookup: {
          from: 'Users',
          localField: 'idCreator',
          foreignField: '_id',
          as: 'creator',
        },
      },
      {
        $lookup: {
          from: 'PartPayments',
          localField: '_id',
          foreignField: 'idPayment',
          as: 'partPayments',
        },
      },
      {
        $lookup: {
          from: 'Debts',
          let: {
            partPaymentDebtIds: '$partPayments.idDebt',
            paymentState: '$sState',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {$in: ['$_id', '$$partPaymentDebtIds']},
                    {
                      $or: [
                        {$eq: ['$$paymentState', 'Anulado']},
                        {$eq: ['$sState', 'Activo']},
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                sReason: 1,
                sState: 1,
              },
            },
          ],
          as: 'relatedDebtsInfo',
        },
      },
      {
        $addFields: {
          activeDebts: {
            $filter: {
              input: '$relatedDebtsInfo',
              as: 'debt',
              cond: {$eq: ['$$debt.sState', 'Activo']},
            },
          },
          allDebts: '$relatedDebtsInfo',
        },
      },
      {
        $addFields: {
          nAmount: '$nAmount',
          nBs: '$nBs',
          client: {
            $last: '$client',
          },
          sReason: {
            $cond: {
              if: {$eq: ['$partPayments', []]},
              then: {
                $concat: [
                  'Abono',
                  {
                    $cond: [{$eq: ['$sState', 'Anulado']}, ' (Anulado)', ''],
                  },
                ],
              },
              else: {
                $cond: {
                  if: {
                    $and: [
                      {$eq: ['$sState', 'Activo']},
                      {$eq: ['$activeDebts', []]},
                    ],
                  },
                  then: 'Abono',
                  else: {
                    $concat: [
                      {
                        $reduce: {
                          input: {
                            $cond: [
                              {$gt: [{$size: '$activeDebts'}, 0]},
                              '$activeDebts.sReason',
                              '$allDebts.sReason',
                            ],
                          },
                          initialValue: '',
                          in: {
                            $cond: {
                              if: {$eq: ['$$value', '']},
                              then: '$$this',
                              else: {$concat: ['$$value', ', ', '$$this']},
                            },
                          },
                        },
                      },
                      {
                        $cond: [
                          {$eq: ['$sState', 'Anulado']},
                          ' (Anulado)',
                          '',
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          sReference: {
            $ifNull: [
              {
                $toString: '$sReference',
              },
              'na',
            ],
          },
          creator: {
            $last: '$creator.sName',
          },
          editor: {
            $ifNull: [
              {
                $last: '$editor.sName',
              },
              '',
            ],
          },
        },
      },
      {
        $addFields: {
          clientName: '$client.sName',
          idClient: '$client._id',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          nAmount: 1,
          nBs: 1,
          clientName: 1,
          idClient: 1,
          sReason: 1,
          sReference: 1,
          bCash: 1,
          creator: 1,
          editor: 1,
          dCreation: 1,
          dEdition: 1,
          sState: 1,
        },
      },
    );

    return this.paymentsRepository.dataSource.connector
      ?.collection('Payments')
      .aggregate(pipeline)
      .toArray();
  }
}
