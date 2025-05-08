import {BindingScope, Getter, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import mongoose from 'mongoose';
import {Clients} from '../models';
import {ClientsRepository} from '../repositories';
import {DebtsService} from './debts.service';
import {UtilsService} from './utils.service';

@injectable({scope: BindingScope.TRANSIENT})
export class ClientService {
  constructor(
    @repository(ClientsRepository)
    public clientsRepository: ClientsRepository,

    @inject.getter('services.DebtsService')
    private debtsService: Getter<DebtsService>,

    @inject.getter('services.UtilsService')
    private utilsService: Getter<UtilsService>,
  ) {}

  async findById(id: string, providerId?: string) {
    const utilsService = await this.utilsService();
    await utilsService.validateClientAccess(id, providerId);

    const ObjectId = mongoose.Types.ObjectId;
    const collection =
      await this.clientsRepository.dataSource.connector?.collection('Clients');

    const pipeline: mongoose.PipelineStage[] = [
      {$match: {_id: new ObjectId(id)}},
      {
        $lookup: {
          from: 'Plans',
          localField: 'idSubscription',
          foreignField: '_id',
          as: 'plans',
        },
      },
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
          from: 'Users',
          localField: 'idInstaller',
          foreignField: '_id',
          as: 'installer',
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
          from: 'Users',
          localField: 'idSuspender',
          foreignField: '_id',
          as: 'suspender',
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
          sState: 1,
          sIp: 1,
          sSn: 1,
          sMac: 1,
          sType: 1,
          nPayment: 1,
          nBalance: 1,
          sAddress: 1,
          sCommentary: 1,
          idSubscription: 1,
          idSector: 1,
          dCreation: 1,
          dSuspension: 1,
          dEdition: 1,
          creator: {$arrayElemAt: ['$creator.sName', 0]},
          editor: {$arrayElemAt: ['$editor.sName', 0]},
          installer: {$arrayElemAt: ['$installer.sName', 0]},
          suspender: {$arrayElemAt: ['$suspender.sName', 0]},
          plan: {$arrayElemAt: ['$plans.sName', 0]},
          nMBPS: {$arrayElemAt: ['$plans.nMBPS', 0]},
          sector: {$arrayElemAt: ['$sectors.sName', 0]},
        },
      },
    ];
    await this.updateBalance(id);

    const client = await collection.aggregate(pipeline).toArray();
    if (!client) {
      throw new HttpErrors.NotFound('Client not found');
    }

    return client[0];
  }

  async updateById(id: string, client: Partial<Clients>, providerId?: string) {
    const utilsService = await this.utilsService();
    await utilsService.validateClientAccess(id, providerId);

    await this.clientsRepository.updateById(id, client);

    return {
      status: 'success',
      message: 'Cliente actualizado correctamente',
    };
  }

  async updateBalance(id: string) {
    const ObjectId = mongoose.Types.ObjectId;
    const debts = await this.clientsRepository.dataSource.connector
      ?.collection('Debts')
      .find({idClient: new ObjectId(id), sState: 'Activo'})
      .toArray();

    const payments = await this.clientsRepository.dataSource.connector
      ?.collection('Payments')
      .find({idClient: new ObjectId(id), sState: 'Activo'})
      .toArray();

    let totalDebt = 0;

    for (const debt of debts) {
      totalDebt -= debt.nAmount;
    }

    for (const payment of payments) {
      totalDebt += payment.nAmount;
    }

    await this.clientsRepository.updateById(id, {
      nBalance: parseFloat(totalDebt.toFixed(2)),
    });
  }
}
