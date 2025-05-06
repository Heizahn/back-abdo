import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbAbdo77DataSource} from '../datasources';
import {PartPayments, PartPaymentsRelations} from '../models';

export class PartPaymentsRepository extends DefaultCrudRepository<
  PartPayments,
  typeof PartPayments.prototype.id,
  PartPaymentsRelations
> {
  constructor(@inject('datasources.dbABDO77') dataSource: DbAbdo77DataSource) {
    super(PartPayments, dataSource);
  }
}
