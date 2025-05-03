import {Entity, model, property} from '@loopback/repository';

@model()
export class Users extends Entity {
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
  nRole: number;

  @property({
    type: 'date',
    required: true,
  })
  dCreation: string;

  @property({
    type: 'string',
  })
  idOwner?: string;

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
  })
  idCreator?: string;

  @property({
    type: 'number',
  })
  nTag?: number;

  @property({
    type: 'string',
  })
  email: string;

  @property({
    type: 'boolean',
    default: true,
  })
  visible?: boolean;

  constructor(data?: Partial<Users>) {
    super(data);
  }
}

export interface UsersRelations {
  // describe navigational properties here
}

export type UsersWithRelations = Users & UsersRelations;
