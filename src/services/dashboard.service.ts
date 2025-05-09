import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import mongoose from 'mongoose';
import {
  ClientsRepository,
  DebtsRepository,
  PaymentsRepository,
} from '../repositories';
@injectable({scope: BindingScope.TRANSIENT})
export class DashboardService {
  constructor(
    @repository(PaymentsRepository)
    private paymentsRepository: PaymentsRepository,

    @repository(ClientsRepository)
    private clientsRepository: ClientsRepository,

    @repository(DebtsRepository)
    private debtsRepository: DebtsRepository,
  ) {}

  async latestPayments() {
    const pipeline: mongoose.PipelineStage[] = [
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
      {$limit: 10},
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
    ];

    return this.paymentsRepository.dataSource.connector
      ?.collection('Payments')
      .aggregate(pipeline)
      .toArray();
  }

  async monthlyCollection() {
    // Obtener el primer y último día del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthYearString = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    // Pipeline para calcular el total recaudado en pagos del mes
    const paymentsPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          sState: 'Activo',
          dCreation: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {$sum: '$nAmount'},
        },
      },
    ];

    // Pipeline para calcular deudas pendientes del mes
    const debtsPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          sState: 'Activo',
          dCreation: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth,
          },
        },
      },
      {
        $lookup: {
          from: 'PartPayments',
          let: {idDebt: '$_id'},
          as: 'partPayments',
          pipeline: [
            {
              $match: {
                $expr: {$eq: ['$idDebt', '$$idDebt']},
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
          pendiente: {
            $subtract: ['$nAmount', {$sum: '$partPayments.nAmount'}],
          },
        },
      },
      {
        $match: {
          pendiente: {$gt: 0},
        },
      },
      {
        $group: {
          _id: null,
          total: {$sum: '$pendiente'},
        },
      },
    ];

    // Ejecutar ambas agregaciones en paralelo
    const [paymentsResult, debtsResult] = await Promise.all([
      this.paymentsRepository.dataSource.connector
        ?.collection('Payments')
        .aggregate(paymentsPipeline)
        .toArray(),
      this.debtsRepository.dataSource.connector
        ?.collection('Debts')
        .aggregate(debtsPipeline)
        .toArray(),
    ]);

    // Extraer los totales o usar 0 si no hay resultados
    const totalRecaudado =
      paymentsResult?.length > 0 ? paymentsResult[0].total : 0;
    const totalPorRecaudar = debtsResult?.length > 0 ? debtsResult[0].total : 0;

    // Retornar en el formato esperado
    return [
      {
        _id: monthYearString,
        mea0: totalPorRecaudar,
        mea1: totalRecaudado,
      },
    ];
  }

  async clientsStatus() {
    const clientsCollection =
      this.clientsRepository.dataSource.connector?.collection('Clients');

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          sState: 'Activo',
        },
      },
      {
        $group: {
          _id: '',
          solventes: {
            $sum: {
              $cond: [
                {
                  $gte: ['$nBalance', 0],
                },
                1,
                0,
              ],
            },
          },
          morosos: {
            $sum: {
              $cond: [
                {
                  $lt: ['$nBalance', 0],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $replaceWith: {
          data: [
            {
              dim0: 'Solventes',
              id: 0,
              mea0: {
                $toString: '$solventes',
              },
            },
            {
              dim0: 'Morosos',
              id: 1,
              mea0: {
                $toString: '$morosos',
              },
            },
          ],
        },
      },
    ];

    return clientsCollection?.aggregate(pipeline).get();
  }

  async paymentsChartCollection() {
    const paymentsCollection =
      this.paymentsRepository.dataSource.connector?.collection('Payments');
    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          sState: 'Activo',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$dCreation',
              timezone: '-04',
            },
          },
          mea0: {
            $sum: {$cond: [{$eq: ['$bCash', true]}, '$nAmount', 0]},
          },
          mea1: {
            $sum: {$cond: [{$eq: ['$bCash', false]}, '$nAmount', 0]},
          },
          dim0: {
            $addToSet: {
              $dateToString: {
                format: '%d-%m',
                date: '$dCreation',
                timezone: '-04',
              },
            },
          },
        },
      },
      {
        $replaceWith: {
          dim0: {$last: '$dim0'},
          mea0: '$mea0',
          mea1: '$mea1',
          idDate: '$_id',
        },
      },
      {
        $sort: {
          idDate: 1,
        },
      },
      {
        $group: {
          _id: null,
          data: {
            $push: '$$ROOT',
          },
        },
      },
      {
        $addFields: {
          data: {
            $slice: ['$data', -15],
          },
        },
      },
    ];

    return paymentsCollection?.aggregate(pipeline).get();
  }
}
