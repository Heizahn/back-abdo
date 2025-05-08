import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {get, param, post, put, requestBody, response} from '@loopback/rest';
import {Payments} from '../models';
import {PaymentsService} from '../services';

@authenticate('jwt')
export class PaymentsController {
  constructor(
    @inject('services.PaymentsService')
    private paymentsService: PaymentsService,
  ) {}

  @get('/payments/client/{id}')
  @response(200, {
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              nAmount: {type: 'number'},
              sCommentary: {type: 'string'},
              sState: {type: 'string'},
              dCreation: {type: 'string'},
              creator: {type: 'string'},
              editor: {type: 'string'},
              sReason: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async findByClientId(
    @param.path.string('id') id: string,
    @param.query.string('idOwner') idOwner?: string,
  ) {
    return this.paymentsService.findByClientId(id, idOwner);
  }

  @post('/payments')
  @response(200, {
    content: {
      'application/json': {schema: {type: 'object'}},
    },
  })
  async createPayment(
    @requestBody()
    {payment, idDebt}: {payment: Partial<Payments>; idDebt?: string},
  ) {
    return this.paymentsService.createPayment(payment, idDebt);
  }

  @put('/payments/{id}/cancel')
  @response(200, {
    content: {
      'application/json': {schema: {type: 'object'}},
    },
  })
  async cancelPayment(
    @param.path.string('id') id: string,
    @requestBody() {idEditor}: {idEditor: string},
  ) {
    return this.paymentsService.cancelPayment({id, idEditor});
  }

  @get('/payments/client/{id}/types')
  async findTypePaymentsByClientId(
    @param.path.string('id') id: string,
    @param.query.string('idOwner') idOwner?: string,
  ) {
    return this.paymentsService.findTypePaymentsByClientId(id, idOwner);
  }

  @get('/payments/list/simple')
  @response(200, {
    content: {
      'application/json': {schema: {type: 'array'}},
    },
  })
  async getPaymentsListSimple(@param.query.string('idOwner') idOwner?: string) {
    return this.paymentsService.getPaymentsListSimple(idOwner);
  }

  @get('/payments/list/complete')
  async getPaymentsListComplete(
    @param.query.string('idOwner') idOwner?: string,
  ) {
    return this.paymentsService.getPaymentsListComplete(idOwner);
  }
}
