import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbAbdo77DataSource} from '../datasources';
import {Payments, PaymentsRelations} from '../models';

export class PaymentsRepository extends DefaultCrudRepository<
  Payments,
  typeof Payments.prototype.id,
  PaymentsRelations
> {
  constructor(
    @inject('datasources.dbABDO77') dataSource: DbAbdo77DataSource,
  ) {
    super(Payments, dataSource);
  }
}
