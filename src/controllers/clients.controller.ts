import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {Clients} from '../models';
import {ClientService, ClientsService} from '../services';

@authenticate('jwt')
export class ClientsController {
  constructor(
    @inject('services.ClientsService')
    private clientsService: ClientsService,
    @inject('services.ClientService')
    private clientService: ClientService,
  ) {}

  @post('/clients')
  @response(200, {
    description: 'Clients model instance',
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
              sDni: {type: 'string'},
              sPhone: {type: 'string'},
              sAddress: {type: 'string'},
              nPayment: {type: 'number'},
              dCreation: {type: 'string'},
              idCreator: {type: 'string'},
              sState: {type: 'string'},
              sType: {type: 'string'},
              idSector: {type: 'string'},
              idSubscription: {type: 'string'},
              nBalance: {type: 'number'},
            },
          },
        },
      },
    })
    clients: Omit<Clients, 'id'>,
  ) {
    return this.clientsService.create(clients);
  }

  @get('/clients/stats')
  @response(200, {})
  async stats() {
    return this.clientsService.stats();
  }

  @get('/clients')
  @response(200, {
    description: 'Array of Clients model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Clients, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.query.string('provider', {required: false}) providerId?: string,
  ): Promise<Clients[]> {
    return this.clientsService.find(providerId);
  }

  @get('/clients/{id}/details')
  @response(200, {
    description: 'Clients model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Clients, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.query.string('provider', {required: false}) providerId?: string,
  ) {
    return this.clientService.findById(id, providerId);
  }

  @patch('/clients/{id}')
  @response(200, {
    description: 'Clients model instance',
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
          schema: {
            ...getModelSchemaRef(Clients, {partial: true}),
          },
        },
      },
    })
    client: Partial<Clients>,
  ) {
    return this.clientService.updateById(id, client);
  }

  @put('/clients/client/{id}/suspend')
  @response(200, {
    description: 'Clients model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Clients, {includeRelations: true}),
      },
    },
  })
  async updateSuspended(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {idSuspender: {type: 'string'}},
          },
        },
      },
    })
    client: {idSuspender: string},
    @param.query.string('idOwner', {required: false}) idOwner?: string,
  ) {
    return this.clientService.suspendClient(id, client.idSuspender, idOwner);
  }

  @put('/clients/client/{id}/activate')
  @response(200, {
    description: 'Clients model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Clients, {includeRelations: true}),
      },
    },
  })
  async updateActivated(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {type: 'object', properties: {idEditor: {type: 'string'}}},
        },
      },
    })
    client: {idEditor: string},
    @param.query.string('idOwner', {required: false}) idOwner?: string,
  ) {
    return this.clientService.activateClient(id, client.idEditor, idOwner);
  }

  @put('/clients/client/{id}/withdraw')
  @response(200, {
    description: 'Clients model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Clients, {includeRelations: true}),
      },
    },
  })
  async updateWithdraw(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {type: 'object', properties: {idEditor: {type: 'string'}}},
        },
      },
    })
    client: {idEditor: string},
    @param.query.string('idOwner', {required: false}) idOwner?: string,
  ) {
    return this.clientService.withdrawClient(id, client.idEditor, idOwner);
  }

  @get('/clients/search/{term}')
  @response(200, {
    description: 'Array of Clients model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Clients, {includeRelations: true}),
        },
      },
    },
  })
  async search(
    @param.path.string('term') term: string,
    @param.query.string('idOwner', {required: false}) idOwner?: string,
  ) {
    return this.clientsService.findClientByTerm(term, idOwner);
  }
}
