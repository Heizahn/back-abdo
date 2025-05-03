import {Entity, model, property} from '@loopback/repository';

@model()
export class Plans extends Entity {
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
  sName: string;

  @property({
    type: 'number',
    required: true,
  })
  nAmount: number;

  @property({
    type: 'number',
    required: true,
  })
  nMBPS: number;

  @property({
    type: 'string',
    required: true,
  })
  sState: string;

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
    type: 'date',
  })
  dEdition?: string;

  @property({
    type: 'string',
  })
  idEditor?: string;


  constructor(data?: Partial<Plans>) {
    super(data);
  }
}

export interface PlansRelations {
  // describe navigational properties here
}

export type PlansWithRelations = Plans & PlansRelations;
