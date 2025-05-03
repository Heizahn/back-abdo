import {/* inject, */ BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import mongoose from 'mongoose';
import {Plans} from '../models';
import {PlansRepository} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class PlansService {
  constructor(
    @repository(PlansRepository)
    public plansRepository: PlansRepository,
  ) {}

  async create(plan: Plans) {
    try {
      const newPlan = await this.plansRepository.create(plan);

      if (!newPlan) {
        throw new Error('Error al crear el plan');
      }

      return {
        status: 'success',
        message: 'Plan creado correctamente',
      };
    } catch (error) {
      throw new Error('Error al crear el plan');
    }
  }

  async find() {
    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: 'clients',
          localField: 'idSubscription',
          foreignField: '_id',
          as: 'clients',
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
          localField: 'idCreator',
          foreignField: '_id',
          as: 'creator',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          sName: '$sName',
          nAmount: '$nAmount',
          nMBPS: '$nMBPS',
          nClients: {$size: '$clients'},
          sState: '$sState',
          dCreation: '$dCreation',
          creator: '$creator.sName',
          dEdition: '$dEdition',
          editor: '$editor.sName',
        },
      },
    ];

    try {
      return this.plansRepository.dataSource.connector
        ?.collection('Plans')
        .aggregate(pipeline)
        .toArray();
    } catch (error) {
      throw new Error('Error al obtener los planes');
    }
  }

  async update(id: string, plan: Plans) {
    try {
      await this.plansRepository.updateById(id, plan);

      return {
        status: 'success',
        message: 'Plan actualizado correctamente',
      };
    } catch (error) {
      throw new Error('Error al actualizar el plan');
    }
  }

  async getPlansList(): Promise<Plans[]> {
    try {
      const plans = await this.plansRepository.find({
        fields: {
          id: true,
          sName: true,
          nMBPS: true,
        },
        order: ['nMBPS'],
      });

      return plans.map(plan => ({
        id: plan.id,
        sName: `${plan.sName} (${plan.nMBPS} Mbps)`,
      })) as Plans[];
    } catch (error) {
      throw new Error('Error al obtener los planes');
    }
  }
}
