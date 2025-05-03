import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbAbdo77DataSource} from '../datasources';
import {Plans, PlansRelations} from '../models';

export class PlansRepository extends DefaultCrudRepository<
  Plans,
  typeof Plans.prototype.id,
  PlansRelations
> {
  constructor(
    @inject('datasources.dbABDO77') dataSource: DbAbdo77DataSource,
  ) {
    super(Plans, dataSource);
  }
}
