import 'dotenv/config';

import {AuthenticationComponent} from '@loopback/authentication';
import {
  JWTAuthenticationComponent,
  TokenServiceBindings,
} from '@loopback/authentication-jwt';

import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import {DbAbdo77DataSource} from './datasources';
import {MySequence} from './sequence';

export {ApplicationConfig};
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

export class BackAbdoApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    // this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        dirs: ['controllers'],
        extensions: [
          `.controller.${process.env.NODE_ENV === 'production' ? 'js' : 'ts'}`,
        ],
        nested: true,
      },
      services: {
        dirs: ['services'],
        extensions: [
          `.service.${process.env.NODE_ENV === 'production' ? 'js' : 'ts'}`,
        ],
        nested: true,
      },
      repositories: {
        dirs: ['repositories'],
        extensions: [
          `.repository.${process.env.NODE_ENV === 'production' ? 'js' : 'ts'}`,
        ],
        nested: true,
      },
    };

    // Mount authentication system
    this.component(AuthenticationComponent);
    // Mount jwt component
    this.component(JWTAuthenticationComponent);

    // Configurar el datasource
    this.dataSource(DbAbdo77DataSource);

    if (!process.env.SECRET_KEY) {
      throw new Error('SECRET_KEY no ha sido definida');
    }
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(process.env.SECRET_KEY);
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to('72000');
  }
}
