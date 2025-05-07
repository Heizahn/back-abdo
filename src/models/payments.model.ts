import {Entity, model, property} from '@loopback/repository';

@model()
export class Payments extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'number',
    required: true,
  })
  nAmount: number;

  @property({
    type: 'number',
    required: true,
  })
  nBs: number;

  @property({
    type: 'boolean',
    required: true,
  })
  bUSD: boolean;

  @property({
    type: 'boolean',
    required: true,
  })
  bCash: boolean;

  @property({
    type: 'date',
    required: true,
  })
  dCreation: string;

  @property({
    type: 'string',
    required: true,
  })
  idCreator: string;

  @property({
    type: 'string',
    required: true,
  })
  sState: string;

  @property({
    type: 'string',
    required: true,
  })
  sReference: string;

  @property({
    type: 'string',
  })
  sCommentary?: string;

  @property({
    type: 'date',
  })
  dEdition?: string;

  @property({
    type: 'string',
  })
  idEditor?: string;

  @property({
    type: 'string',
    required: true,
  })
  idClient: string;

  constructor(data?: Partial<Payments>) {
    super(data);
  }
}

export interface PaymentsRelations {
  // describe navigational properties here
}

export type PaymentsWithRelations = Payments & PaymentsRelations;
