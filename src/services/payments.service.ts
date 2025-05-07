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
  ) {}

  // Función auxiliar para redondear a 2 decimales
  private roundToTwoDecimals(num: number): number {
    return parseFloat(num.toFixed(2));
  }

  async findByClientId(id: string) {
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
          let: {partPaymentDebtIds: '$partPayments.idDebt'},
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {$in: ['$_id', '$$partPaymentDebtIds']},
                    {$eq: ['$sState', 'Activo']},
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                sReason: 1,
              },
            },
          ],
          as: 'relatedDebtsInfo',
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
              then: 'Abono',
              else: {
                $reduce: {
                  input: '$relatedDebtsInfo.sReason',
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

      let remainingAmount = paymentData.nAmount;
      const clientId = new ObjectId(paymentData.idClient);

      if (idDebt) {
        // Buscar la deuda específica
        const debt = await debtsCollection.findOne({
          _id: new ObjectId(idDebt),
          sState: 'Activo',
        });
        console.log('Deuda encontrada:', debt);
        if (!debt) {
          throw new HttpErrors.NotFound('Deuda no encontrada o no activa');
        }

        // Calcular saldo pendiente REAL antes de crear la parte de pago
        const partPayments = await partPaymentsCollection
          .find({idDebt: new ObjectId(idDebt)})
          .toArray();
        console.log('Partes de pago existentes para esta deuda:', partPayments);

        const totalPartPayments = partPayments.reduce(
          (sum: number, pp: {nAmount: number}) => sum + pp.nAmount,
          0,
        );
        const pendiente = this.roundToTwoDecimals(
          debt.nAmount - totalPartPayments,
        );
        console.log(
          'Pendiente real de la deuda:',
          pendiente,
          '(Monto deuda:',
          debt.nAmount,
          '- Total partes de pago:',
          totalPartPayments,
          ')',
        );

        if (pendiente > 0) {
          const amountToUse = this.roundToTwoDecimals(
            Math.min(remainingAmount, pendiente),
          );
          if (amountToUse > 0) {
            await partPaymentsCollection.insertOne({
              idDebt: new ObjectId(idDebt),
              idPayment: paymentCreated.id,
              nAmount: amountToUse,
            });
            console.log('Parte de pago creada:', {
              idDebt: new ObjectId(idDebt),
              idPayment: paymentCreated.id,
              nAmount: amountToUse,
            });
            remainingAmount = this.roundToTwoDecimals(
              remainingAmount - amountToUse,
            );
          }
        } else {
          console.log(
            'No se crea parte de pago porque la deuda ya está pagada o no tiene pendiente.',
          );
        }
      } else {
        // Buscar todas las deudas activas con saldo pendiente
        const debts = await debtsCollection
          .aggregate([
            {$match: {idClient: clientId, sState: 'Activo'}},
            {
              $lookup: {
                from: 'PartPayments',
                localField: '_id',
                foreignField: 'idDebt',
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
          ])
          .toArray();
        console.log('Deudas activas con pendiente:', debts);

        for (const debt of debts) {
          if (remainingAmount <= 0) break;

          // Calcular pendiente real de la deuda antes de crear la parte de pago
          const partPayments = await partPaymentsCollection
            .find({idDebt: debt._id})
            .toArray();
          const totalPartPayments = partPayments.reduce(
            (sum: number, pp: {nAmount: number}) => sum + pp.nAmount,
            0,
          );
          const pendiente = this.roundToTwoDecimals(
            debt.nAmount - totalPartPayments,
          );
          console.log(
            'Pendiente real de la deuda',
            debt._id,
            ':',
            pendiente,
            '(Monto deuda:',
            debt.nAmount,
            '- Total partes de pago:',
            totalPartPayments,
            ')',
          );

          if (pendiente <= 0) {
            console.log(
              'No se crea parte de pago para deuda',
              debt._id,
              'porque ya está pagada.',
            );
            continue;
          }

          const amountToUse = this.roundToTwoDecimals(
            Math.min(remainingAmount, pendiente),
          );
          if (amountToUse > 0) {
            await partPaymentsCollection.insertOne({
              idDebt: debt._id,
              idPayment: paymentCreated.id,
              nAmount: amountToUse,
            });
            console.log('Parte de pago creada:', {
              idDebt: debt._id,
              idPayment: paymentCreated.id,
              nAmount: amountToUse,
            });
            remainingAmount = this.roundToTwoDecimals(
              remainingAmount - amountToUse,
            );
          }
        }
      }

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
}
