import {Entity, model, property} from '@loopback/repository';

@model()
export class Debts extends Entity {
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
  sReason: string;

  @property({
    type: 'number',
    required: true,
  })
  nAmount: number;

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
  })
  sCommentary?: string;

  @property({
    type: 'string',
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


  constructor(data?: Partial<Debts>) {
    super(data);
  }
}

export interface DebtsRelations {
  // describe navigational properties here
}

export type DebtsWithRelations = Debts & DebtsRelations;
