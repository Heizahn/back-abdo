import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import mongoose from 'mongoose';
import {Clients} from '../models';
import {ClientsRepository} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class ClientsService {
  constructor(
    @repository(ClientsRepository)
    public clientsRepository: ClientsRepository,
  ) {}

  async create(client: Clients) {
    try {
      const newClient = await this.clientsRepository.create(client);

      console.log(newClient);
      if (!newClient) {
        throw new Error('Error al crear el cliente');
      }

      return {
        status: 'success',
        message: 'Cliente creado correctamente',
      };
    } catch (error) {
      if (error.statusCode === 422) {
        throw HttpErrors.UnprocessableEntity(error.message);
      }
      throw new Error('Error al crear el cliente');
    }
  }

  async stats(providerId?: string) {
    const pipeline: mongoose.PipelineStage[] = [];

    if (providerId) {
      pipeline.push({
        $match: {
          idOwner: providerId ?? new mongoose.Types.ObjectId(providerId),
        },
      });
    }

    pipeline.push({
      $project: {
        _id: 0,
        sState: 1,
        nBalance: 1,
      },
    });

    const clients: {sState: string; nBalance: number}[] =
      await this.clientsRepository.dataSource.connector
        ?.collection('Clients')
        .aggregate(pipeline)
        .toArray();

    return {
      todos: clients.filter(client => client.sState !== 'Retirado').length,
      solventes: clients.filter(
        client =>
          client.sState === 'Activo' &&
          client.nBalance !== undefined &&
          client.nBalance >= 0,
      ).length,
      morosos: clients.filter(
        client =>
          client.sState === 'Activo' &&
          client.nBalance !== undefined &&
          client.nBalance < 0,
      ).length,
      suspendidos: clients.filter(client => client.sState === 'Suspendido')
        .length,
      retirados: clients.filter(client => client.sState === 'Retirado').length,
    };
  }

  async find(providerId?: string) {
    const pipeline: mongoose.PipelineStage[] = [];

    if (providerId) {
      pipeline.push({
        $match: {
          idOwner: providerId ?? new mongoose.Types.ObjectId(providerId),
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'Sectors',
          localField: 'idSector',
          foreignField: '_id',
          as: 'sectors',
        },
      },
      {
        $lookup: {
          from: 'Plans',
          localField: 'idSubscription',
          foreignField: '_id',
          as: 'plans',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          sName: 1,
          sDni: 1,
          sRif: 1,
          sPhone: 1,
          sector: {$arrayElemAt: ['$sectors.sName', 0]},
          sIp: 1,
          plan: {$arrayElemAt: ['$plans.sName', 0]},
          nMBPS: {$arrayElemAt: ['$plans.nMBPS', 0]},
          nPayment: 1,
          nBalance: 1,
          sState: 1,
        },
      },
    );

    return this.clientsRepository.dataSource.connector
      ?.collection('Clients')
      .aggregate(pipeline)
      .toArray();
  }

  async findClientByTerm(term: string, idOwner?: string) {
    const pipeline: mongoose.PipelineStage[] = [];

    // 1. Filtrar por providerId si está presente, el término de búsqueda y estado
    const matchConditions: mongoose.FilterQuery<Clients>[] = [
      {
        $or: [
          {sDni: {$regex: term, $options: 'i'}},
          {sName: {$regex: term, $options: 'i'}},
          {sPhone: {$regex: term, $options: 'i'}},
        ],
      },
      {sState: {$ne: 'Retirado'}},
    ];

    if (idOwner) {
      matchConditions.push({idOwner: idOwner});
    }

    pipeline.push({$match: {$and: matchConditions}});

    // 2. Buscar los últimos 3 pagos del cliente
    pipeline.push({
      $lookup: {
        from: 'Payments',
        let: {idClient: '$_id'},
        as: 'ultimosPagos',
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$idClient', '$$idClient'],
              },
            },
          },
          {
            $sort: {dCreation: -1},
          },
          {$limit: 3},
          // Añadir lookup a PartPayments para verificar si el pago tiene partes
          {
            $lookup: {
              from: 'PartPayments',
              localField: '_id',
              foreignField: 'idPayment',
              as: 'partPayments',
            },
          },
          // Añadir lookup a Debts para obtener las razones de las facturas
          {
            $lookup: {
              from: 'Debts',
              let: {partPaymentDebtIds: '$partPayments.idDebt'},
              pipeline: [
                {
                  $match: {
                    $expr: {$in: ['$_id', '$$partPaymentDebtIds']},
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
              as: 'relatedDebts',
            },
          },
          // Dar formato directo a los pagos
          {
            $project: {
              _id: 0,
              id: '$_id', // Cambiar _id por id como espera el frontend
              bCash: 1,
              dCreation: 1,
              sReference: {$ifNull: ['$sReference', '']},
              sReason: {
                $cond: {
                  if: {$eq: [{$size: '$partPayments'}, 0]},
                  then: 'Abono',
                  else: {
                    $cond: {
                      if: {$eq: [{$size: '$relatedDebts'}, 0]},
                      then: 'Abono',
                      else: {
                        $reduce: {
                          input: '$relatedDebts',
                          initialValue: '',
                          in: {
                            $cond: {
                              if: {$eq: ['$$value', '']},
                              then: '$$this.sReason',
                              else: {
                                $concat: ['$$value', ', ', '$$this.sReason'],
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              nAmount: 1,
              nBs: 1,
            },
          },
        ],
      },
    });

    //3. Buscar las ultimas 3 facturas del cliente
    pipeline.push({
      $lookup: {
        from: 'Debts',
        let: {idClient: '$_id'},
        as: 'ultimasFacturas',
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$idClient', '$$idClient'],
              },
            },
          },
          {
            $sort: {dCreation: -1},
          },
          {
            $limit: 3,
          },
          //Formatear el resultado
          {
            $project: {
              _id: 0,
              id: '$_id',
              sReason: 1,
              dCreation: 1,
              nAmount: 1,
              sState: 1,
            },
          },
        ],
      },
    });

    // 4. Buscar información del plan, sector
    pipeline.push(
      {
        $lookup: {
          from: 'Plans',
          localField: 'idSubscription',
          foreignField: '_id',
          as: 'plan',
        },
      },
      {
        $lookup: {
          from: 'Sectors',
          localField: 'idSector',
          foreignField: '_id',
          as: 'sector',
        },
      },
    );

    // 5. Formatear el resultado final
    pipeline.push({
      $project: {
        _id: 0,
        id: '$_id',
        sName: 1,
        sDni: 1,
        sPhone: 1,
        sector: {$arrayElemAt: ['$sector.sName', 0]},
        plan: {$arrayElemAt: ['$plan.sName', 0]},
        nMBPS: {$arrayElemAt: ['$plan.nMBPS', 0]},
        nPayment: 1,
        nBalance: 1,
        sState: 1,
        ultimosPagos: {
          $map: {
            input: '$ultimosPagos',
            as: 'pago',
            in: {
              id: '$$pago.id',
              bCash: {$toBool: '$$pago.bCash'},
              dCreation: '$$pago.dCreation',
              sReference: {$ifNull: ['$$pago.sReference', '']},
              sReason: '$$pago.sReason',
              nAmount: {$toDouble: '$$pago.nAmount'},
              nBs: {$toDouble: '$$pago.nBs'},
            },
          },
        },
        ultimasFacturas: 1,
      },
    });

    return this.clientsRepository.dataSource.connector
      ?.collection('Clients')
      .aggregate(pipeline)
      .toArray();
  }
}
