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
import {Plans} from '../models';
import {PlansService} from '../services';

@authenticate('jwt')
export class PlansController {
  constructor(
    @inject('services.PlansService')
    private plansService: PlansService,
  ) {}

  @post('/plans')
  @response(200, {
    description: 'Plans model instance',
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
              nAmount: {type: 'number'},
              nMBPS: {type: 'number'},
              sState: {type: 'string'},
              dCreation: {type: 'string'},
              idCreator: {type: 'string'},
            },
          },
        },
      },
    })
    plan: Omit<Plans, 'id'>,
  ): Promise<{status: string; message: string}> {
    return this.plansService.create(plan);
  }

  @get('/plans')
  @response(200, {
    description: 'Array of Plans model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sName: {type: 'string'},
              nAmount: {type: 'number'},
              nMBPS: {type: 'number'},
              nClients: {type: 'number'},
              sState: {type: 'string'},
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
  async find(): Promise<Plans[]> {
    return this.plansService.find();
  }

  @get('/plans/list')
  @response(200, {
    description: 'Array of Plans model instances',
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
  async getPlansList(): Promise<Plans[]> {
    return this.plansService.getPlansList();
  }

  // @get('/plans/{id}')
  // @response(200, {
  //   description: 'Plans model instance',
  //   content: {
  //     'application/json': {
  //       schema: getModelSchemaRef(Plans, {includeRelations: true}),
  //     },
  //   },
  // })
  // async findById(
  //   @param.path.string('id') id: string,
  //   @param.filter(Plans, {exclude: 'where'})
  //   filter?: FilterExcludingWhere<Plans>,
  // ): Promise<Plans> {
  //   return this.plansRepository.findById(id, filter);
  // }

  @patch('/plans/{id}')
  @response(204, {
    description: 'Plans PATCH success',
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
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Plans, {partial: true}),
        },
      },
    })
    plans: Plans,
  ): Promise<{status: string; message: string}> {
    return this.plansService.update(id, plans);
  }
}
