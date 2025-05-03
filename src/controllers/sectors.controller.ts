import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {Sectors} from '../models';
import {SectorsService} from '../services';

@authenticate('jwt')
export class SectorsController {
  constructor(
    @inject('services.SectorsService')
    private sectorsService: SectorsService,
  ) {}

  @post('/sectors')
  @response(200, {
    description: 'Sectors model instance',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            message: {type: 'string'},
          },
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              sName: {type: 'string'},
              sStatus: {type: 'string'},
              idCreator: {type: 'string'},
              dCreation: {type: 'string', format: 'date-time'},
            },
          },
        },
      },
    })
    sectors: Omit<Sectors, 'id'>,
  ): Promise<{status: string; message: string}> {
    return this.sectorsService.create(sectors);
  }

  @get('/sectors')
  @response(200, {
    description: 'Array of Sectors model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sName: {type: 'string'},
              nClients: {type: 'number'},
              sStatus: {type: 'string'},
              creator: {type: 'string'},
              dCreation: {type: 'string', format: 'date-time'},
              editor: {type: 'string', nullable: true},
              dEdition: {type: 'string', format: 'date-time', nullable: true},
            },
          },
        },
      },
    },
  })
  async find(): Promise<Sectors[]> {
    return this.sectorsService.find();
  }

  @patch('/sectors/{id}')
  @response(204, {
    description: 'Sectors PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Sectors, {partial: true}),
        },
      },
    })
    sectors: Sectors,
  ): Promise<{status: string; message: string}> {
    return this.sectorsService.update(id, sectors);
  }

  @get('/sectors/list')
  @response(200, {
    description: 'Array of Sectors model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {id: {type: 'string'}, sName: {type: 'string'}},
          },
        },
      },
    },
  })
  async getSectorsList(): Promise<Sectors[]> {
    return this.sectorsService.getSectorsList();
  }
}
