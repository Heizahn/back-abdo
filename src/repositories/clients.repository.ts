import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbAbdo77DataSource} from '../datasources';
import {Clients, ClientsRelations} from '../models';

export class ClientsRepository extends DefaultCrudRepository<
  Clients,
  typeof Clients.prototype.id,
  ClientsRelations
> {
  constructor(
    @inject('datasources.dbABDO77') dataSource: DbAbdo77DataSource,
  ) {
    super(Clients, dataSource);
  }
}
