import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbAbdo77DataSource} from '../datasources';
import {Debts, DebtsRelations} from '../models';

export class DebtsRepository extends DefaultCrudRepository<
  Debts,
  typeof Debts.prototype.id,
  DebtsRelations
> {
  constructor(
    @inject('datasources.dbABDO77') dataSource: DbAbdo77DataSource,
  ) {
    super(Debts, dataSource);
  }
}
