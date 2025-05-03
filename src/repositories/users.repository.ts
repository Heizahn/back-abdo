import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbAbdo77DataSource} from '../datasources';
import {Users, UsersRelations} from '../models';

export class UsersRepository extends DefaultCrudRepository<
  Users,
  typeof Users.prototype.id,
  UsersRelations
> {
  constructor(
    @inject('datasources.dbABDO77') dataSource: DbAbdo77DataSource,
  ) {
    super(Users, dataSource);
  }
}
