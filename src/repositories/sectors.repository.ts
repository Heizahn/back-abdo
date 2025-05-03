import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbAbdo77DataSource} from '../datasources';
import {Sectors, SectorsRelations} from '../models';

export class SectorsRepository extends DefaultCrudRepository<
  Sectors,
  typeof Sectors.prototype.id,
  SectorsRelations
> {
  constructor(
    @inject('datasources.dbABDO77') dataSource: DbAbdo77DataSource,
  ) {
    super(Sectors, dataSource);
  }
}
