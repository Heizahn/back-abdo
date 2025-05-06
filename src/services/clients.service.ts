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
}
