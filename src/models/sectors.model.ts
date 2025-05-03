import {Entity, model, property} from '@loopback/repository';

@model()
export class Sectors extends Entity {
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
    type: 'string',
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

  constructor(data?: Partial<Sectors>) {
    super(data);
  }
}

export interface SectorsRelations {
  // describe navigational properties here
}

export type SectorsWithRelations = Sectors & SectorsRelations;
