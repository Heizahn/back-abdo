import {BindingScope, Getter, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import mongoose from 'mongoose';
import {Debts} from '../models/debts.model';
import {DebtsRepository} from '../repositories/debts.repository';
import {ClientService} from './client.service';
@injectable({scope: BindingScope.TRANSIENT})
export class DebtsService {
  constructor(
    @repository(DebtsRepository)
    private debtsRepository: DebtsRepository,

    @inject.getter('services.ClientService')
    private clientService: Getter<ClientService>,
  ) {}

  async create(debt: Omit<Debts, 'id'>) {
    try {
      const newDebt = await this.debtsRepository.create(debt);

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
                  $and: [
                    {$eq: ['$idDebt', '$$idDebt']},
                    {$eq: ['$sState', 'Activo']},
                  ],
                },
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
    return debts;
  }
}
