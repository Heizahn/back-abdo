import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

if (!process.env.DB_URL) {
  throw new Error('Debes definir las variables de entorno DB_URL');
}

const config = {
  name: 'dbABDO77',
  connector: 'mongodb',
  url: process.env.DB_URL,
  host: '',
  port: 0,
  user: '',
  password: '',
  database: '',
  useNewUrlParser: true,
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class DbAbdo77DataSource
  extends juggler.DataSource
  implements LifeCycleObserver
{
  static dataSourceName = 'dbABDO77';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.dbABDO77', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
