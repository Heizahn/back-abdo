import {Entity, model, property} from '@loopback/repository';

@model()
export class Clients extends Entity {
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
  sRif?: string;

  @property({
    type: 'string',
  })
  sDni?: string;

  @property({
    type: 'string',
    required: true,
  })
  sPhone: string;

  @property({
    type: 'string',
  })
  sGps?: string;

  @property({
    type: 'string',
    required: true,
  })
  sAddress: string;

  @property({
    type: 'number',
    required: true,
  })
  nPayment: number;

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
  dSuspension?: string;

  @property({
    type: 'string',
  })
  idSuspender?: string;

  @property({
    type: 'string',
    required: true,
  })
  sState: string;

  @property({
    type: 'string',
  })
  sSn?: string;

  @property({
    type: 'string',
  })
  sMac?: string;

  @property({
    type: 'string',
  })
  sIp?: string;

  @property({
    type: 'string',
    required: true,
  })
  sType: string;

  @property({
    type: 'string',
  })
  idOwner?: string;

  @property({
    type: 'string',
  })
  idInstaller?: string;

  @property({
    type: 'string',
    required: true,
  })
  idSubscription: string;

  @property({
    type: 'number',
    default: 0,
  })
  nBalance?: number;

  @property({
    type: 'string',
    required: true,
  })
  idSector: string;

  @property({
    type: 'string',
  })
  idEditor?: string;

  @property({
    type: 'string',
  })
  dEdition?: string;

  @property({
    type: 'string',
  })
  sCommentary?: string;

  constructor(data?: Partial<Clients>) {
    super(data);
  }
}

export interface ClientsRelations {
  // describe navigational properties here
}

export type ClientsWithRelations = Clients & ClientsRelations;
