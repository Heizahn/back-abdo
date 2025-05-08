import {BindingScope, Getter, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import mongoose from 'mongoose';
import {Debts} from '../models/debts.model';
import {DebtsRepository} from '../repositories/debts.repository';
import {ClientService} from './client.service';

interface DebtWithDebt extends Debts {
  debt: number;
}

@injectable({scope: BindingScope.TRANSIENT})
export class DebtsService {
  constructor(
    @repository(DebtsRepository)
    private debtsRepository: DebtsRepository,

    @inject.getter('services.ClientService')
    private clientService: Getter<ClientService>,
  ) {}

  // Función auxiliar para redondear a 2 decimales
  private roundToTwoDecimals(num: number): number {
    return parseFloat(num.toFixed(2));
  }

  async create(debt: Omit<Debts, 'id'>) {
    try {
      // Redondear el monto de la deuda
      debt.nAmount = this.roundToTwoDecimals(debt.nAmount);

      const newDebt = await this.debtsRepository.create(debt);
      console.log('Nueva deuda creada:', newDebt);

      const clientId = new mongoose.Types.ObjectId(debt.idClient);
      console.log('ID del cliente convertido a ObjectId:', clientId);

      // Verificar pagos básicos
      const basicPayments = await this.debtsRepository.dataSource.connector
        ?.collection('Payments')
        .find({
          idClient: clientId,
          sState: 'Activo',
        })
        .sort({dCreation: 1})
        .toArray();

      console.log(
        'Pagos básicos encontrados:',
        JSON.stringify(basicPayments, null, 2),
      );

      // Verificar partes de pago existentes SOLO de deudas activas
      const existingPartPayments =
        await this.debtsRepository.dataSource.connector
          ?.collection('PartPayments')
          .aggregate([
            {
              $lookup: {
                from: 'Debts',
                localField: 'idDebt',
                foreignField: '_id',
                as: 'debt',
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
                'debt.sState': 'Activo',
                'payment.sState': 'Activo',
                idPayment: {
                  $in: basicPayments.map(
                    (p: {_id: mongoose.Types.ObjectId}) => p._id,
                  ),
                },
              },
            },
          ])
          .toArray();

      console.log(
        'Partes de pago existentes (solo de deudas activas y pagos activos):',
        JSON.stringify(existingPartPayments, null, 2),
      );

      // Procesar los pagos y crear partes de pago
      if (basicPayments && basicPayments.length > 0) {
        console.log('Procesando pagos disponibles...');
        const partPaymentsCollection =
          this.debtsRepository.dataSource.connector?.collection('PartPayments');

        const remainingDebt = debt.nAmount;
        console.log('Monto de la deuda a cubrir:', remainingDebt);

        // Solo crear partes de pago si la deuda pendiente es mayor a 0
        if (remainingDebt > 0) {
          for (const payment of basicPayments) {
            if (remainingDebt <= 0) {
              console.log(
                'Deuda completamente cubierta, no se necesitan más pagos',
              );
              break;
            }

            // Calcular el total de partes de pago para este pago
            const paymentParts = existingPartPayments.filter(
              (pp: {idPayment: mongoose.Types.ObjectId}) =>
                pp.idPayment.toString() === payment._id.toString(),
            );
            const totalPartPayments = paymentParts.reduce(
              (sum: number, pp: {nAmount: number}) => sum + pp.nAmount,
              0,
            );

            console.log('Pago actual:', JSON.stringify(payment, null, 2));
            console.log(
              'Partes de pago para este pago:',
              JSON.stringify(paymentParts, null, 2),
            );
            console.log(
              'Total de partes de pago para este pago:',
              totalPartPayments,
            );

            // Calcular el pendiente real de la deuda ANTES de crear la parte de pago
            const debtParts = await partPaymentsCollection
              .aggregate([
                {
                  $match: {
                    idDebt: newDebt.id,
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

            const totalDebtParts = debtParts.reduce(
              (sum: number, pp: {nAmount: number}) => sum + pp.nAmount,
              0,
            );
            const pendiente = this.roundToTwoDecimals(
              debt.nAmount - totalDebtParts,
            );
            console.log('Pendiente real de la deuda:', pendiente);
            if (pendiente <= 0) {
              console.log(
                'La deuda ya está completamente pagada, no se crean más partes de pago.',
              );
              break;
            }

            const availableAmount = this.roundToTwoDecimals(
              payment.nAmount - totalPartPayments,
            );
            console.log('Monto disponible en el pago:', availableAmount);

            // Solo crear parte de pago si hay monto disponible y la deuda pendiente es mayor a 0
            if (availableAmount > 0 && pendiente > 0) {
              const amountToUse = this.roundToTwoDecimals(
                Math.min(availableAmount, pendiente),
              );
              if (amountToUse > 0 && amountToUse <= pendiente) {
                await partPaymentsCollection?.insertOne({
                  idDebt: newDebt.id,
                  idPayment: payment._id,
                  nAmount: amountToUse,
                });
                console.log('Parte de pago creada por:', amountToUse);
              }
            }
          }
        } else {
          console.log(
            'La deuda ya está en cero o menor, no se crean partes de pago.',
          );
        }
      } else {
        console.log('No hay pagos disponibles para procesar');
      }

      const clientService = await this.clientService();
      await clientService.updateBalance(debt.idClient);

      return {
        status: 'success',
        message: 'Debt created successfully',
        data: newDebt,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  async update(id: string, debt: Partial<Debts>) {
    const ObjectId = mongoose.Types.ObjectId;

    if (!ObjectId.isValid(id)) {
      throw new HttpErrors.BadRequest('Identificador de deuda invalido');
    }

    await this.debtsRepository.updateById(id, debt);

    const debtUpdated = await this.debtsRepository.findById(id);

    const clientService = await this.clientService();
    await clientService.updateBalance(debtUpdated.idClient);

    return {
      status: 'success',
      message: 'Debt updated successfully',
      data: debt,
    };
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
          from: 'PartPayments',
          let: {
            idDebt: '$_id',
          },
          as: 'partPayments',
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{$eq: ['$idDebt', '$$idDebt']}],
                },
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
        },
      },
      {
        $addFields: {
          debt: {
            $cond: [
              {$eq: ['$sState', 'Activo']},
              {$subtract: ['$nAmount', {$sum: '$partPayments.nAmount'}]},
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          nAmount: 1,
          sReason: 1,
          sState: 1,
          debt: 1,
          dCreation: 1,
          idCreator: 1,
          idEditor: 1,
          dEdition: 1,
          creator: {$arrayElemAt: ['$creator.sName', 0]},
          editor: {$arrayElemAt: ['$editor.sName', 0]},
        },
      },
    ];

    const debts = await this.debtsRepository.dataSource.connector
      ?.collection('Debts')
      .aggregate(pipeline)
      .toArray();

    return debts.map((debt: DebtWithDebt) => ({
      ...debt,
      debt: this.roundToTwoDecimals(debt.debt),
    }));
  }

  async listDebts(idClient?: string) {
    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          sState: 'Activo',
          idClient: new mongoose.Types.ObjectId(idClient),
        },
      },
      {
        $lookup: {
          from: 'PartPayments',
          let: {
            idDebt: '$_id',
          },
          as: 'partPayments',
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{$eq: ['$idDebt', '$$idDebt']}],
                },
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
        },
      },
      {
        $addFields: {
          debt: {
            $cond: [
              {$eq: ['$sState', 'Activo']},
              {$subtract: ['$nAmount', {$sum: '$partPayments.nAmount'}]},
              0,
            ],
          },
        },
      },
      {
        $sort: {
          dCreation: 1,
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          sReason: 1,
          debt: 1,
        },
      },
    ];

    const debts = await this.debtsRepository.dataSource.connector
      ?.collection('Debts')
      .aggregate(pipeline)
      .toArray();

    const debtsFiltered = debts.filter((debt: {debt: number}) => debt.debt > 0);

    return debtsFiltered.map((debt: DebtWithDebt) => ({
      ...debt,
      debt: this.roundToTwoDecimals(debt.debt),
    }));
  }
}
