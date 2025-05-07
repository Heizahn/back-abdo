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
import {Debts} from '../models/debts.model';
import {DebtsService} from '../services/debts.service';

@authenticate('jwt')
export class DebtsController {
  constructor(
    @inject('services.DebtsService')
    private debtsService: DebtsService,
  ) {}

  @post('/debts/create')
  @response(200, {
    description: 'Create a new debt',
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
              sReason: {type: 'string'},
              nAmount: {type: 'number'},
              sCommentary: {type: 'string', nullable: true},
              idClient: {type: 'string'},
              idCreator: {type: 'string'},
              sState: {type: 'string'},
              dCreation: {type: 'string'},
            },
          },
        },
      },
    })
    debt: Omit<Debts, 'id'>,
  ) {
    return this.debtsService.create(debt);
  }

  @get('/debts/client/{id}')
  @response(200, {
    description: 'List of debts by client id',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              sReason: {type: 'string'},
              nAmount: {type: 'number'},
              debt: {type: 'number'},
              sState: {type: 'string'},
              dCreation: {type: 'string'},
              idCreator: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async findClientDebts(@param.path.string('id') id: string) {
    return this.debtsService.findByClientId(id);
  }

  @patch('/debts/{id}')
  @response(200, {
    description: 'Update a debt',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Debts),
      },
    },
  })
  async update(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            ...getModelSchemaRef(Debts, {partial: true}),
          },
        },
      },
    })
    debt: Partial<Debts>,
  ) {
    return this.debtsService.update(id, debt);
  }

  @get('/debts/client/list/{id}')
  @response(200, {
    description: 'List of debts',
    content: {
      'application/json': {schema: getModelSchemaRef(Debts)},
    },
  })
  async listDebts(@param.path.string('id') id: string) {
    return this.debtsService.listDebts(id);
  }
}
