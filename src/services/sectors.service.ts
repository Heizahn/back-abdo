import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import mongoose from 'mongoose';
import {Sectors} from '../models';
import {SectorsRepository} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class SectorsService {
  constructor(
    @repository(SectorsRepository)
    public sectorsRepository: SectorsRepository,
  ) {}

  async create(sector: Omit<Sectors, 'id'>) {
    try {
      const newSector = await this.sectorsRepository.create(sector);

      if (!newSector) {
        throw new Error('Error al crear el sector');
      }

      return {
        status: 'success',
        message: 'Sector creado correctamente',
      };
    } catch (error) {
      throw new Error('Error al crear el sector');
    }
  }

  async find() {
    try {
      const pipeline: mongoose.PipelineStage[] = [
        {
          $lookup: {
            from: 'Clients',
            localField: '_id',
            foreignField: 'idSector',
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
            localField: 'idEditor',
            foreignField: '_id',
            as: 'editor',
          },
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            sName: '$sName',
            nClients: {
              $size: '$clients',
            },
            sState: '$sState',
            creator: '$creator.sName',
            dCreation: '$dCreation',
            editor: '$editor.sName',
            dEdition: '$dEdition',
          },
        },
      ];

      return this.sectorsRepository.dataSource.connector
        ?.collection('Sectors')
        .aggregate(pipeline)
        .toArray();
    } catch (error) {
      throw new Error('Error al obtener los sectores');
    }
  }

  async update(id: string, sector: Partial<Sectors>) {
    try {
      await this.sectorsRepository.updateById(id, sector);

      return {
        status: 'success',
        message: 'Sector actualizado correctamente',
      };
    } catch (error) {
      throw new Error('Error al actualizar el sector');
    }
  }

  async getSectorsList() {
    try {
      const sectors = await this.sectorsRepository.find({
        fields: {
          id: true,
          sName: true,
        },
        order: ['sName'],
      });

      return sectors;
    } catch (error) {
      throw new Error('Error al obtener los sectores');
    }
  }
}
