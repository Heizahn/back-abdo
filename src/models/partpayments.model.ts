import {Entity, model, property} from '@loopback/repository';

@model()
export class PartPayments extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  idPayment: string;

  @property({
    type: 'string',
    required: true,
  })
  idDebt: string;

  @property({
    type: 'number',
    required: true,
  })
  nAmount: number;

  constructor(data?: Partial<PartPayments>) {
    super(data);
  }
}

export interface PartPaymentsRelations {
  // describe navigational properties here
}

export type PartPaymentsWithRelations = PartPayments & PartPaymentsRelations;
