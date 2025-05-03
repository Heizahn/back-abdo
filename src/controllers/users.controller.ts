import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  get,
  post,
  Request,
  requestBody,
  response,
  RestBindings,
} from '@loopback/rest';
import {Credentials} from '../interfaces/users';
import {Users} from '../models';
import {UsersService} from '../services';

export class UsersController {
  constructor(
    @inject('services.UsersService')
    private usersService: UsersService,
    @inject(RestBindings.Http.REQUEST)
    private request: Request,
  ) {}

  @post('/users/login')
  @response(200, {
    description: 'Token',
    content: {
      'application/json': {
        schema: {
          type: 'object' as const,
          properties: {
            token: {
              type: 'string' as const,
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody({
      description: 'The input of login function',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                format: 'email',
                example: 'test@test.com',
              },
              password: {
                type: 'string',
                minLength: 8,
                example: '123456789',
              },
            },
          },
        },
      },
    })
    credentials: Credentials,
  ): Promise<{token: string}> {
    return this.usersService.login(credentials);
  }

  @authenticate('jwt')
  @get('/users/me')
  @response(200, {
    description: 'Return current user',
    content: {
      'application/json': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  async getUserMe() {
    return this.usersService.getUserMe(
      this.request.headers.authorization as string,
    );
  }

  @authenticate('jwt')
  @get('/users/providers')
  @response(200, {
    description: 'Return providers',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              tag: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async getProviders() {
    return this.usersService.getProviders();
  }

  @authenticate('jwt')
  @get('/users/list')
  @response(200, {
    description: 'Return list of users',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              name: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async getUsersList() {
    return this.usersService.getUsersList();
  }

  @authenticate('jwt')
  @post('/users/create')
  @response(200, {
    description: 'Create user',
    content: {
      'application/json': {
        schema: {
          type: 'object' as const,
          properties: {
            user: {
              type: 'object' as const,
              properties: {
                sName: {type: 'string'},
                email: {type: 'string'},
                nRole: {type: 'number'},
                visible: {type: 'boolean'},
                nTag: {type: 'number'},
                sState: {type: 'string'},
                idCreator: {type: 'string', nullable: true},
                idOwner: {type: 'string', nullable: true},
              },
            },
            password: {type: 'string'},
          },
        },
      },
    },
  })
  async createUser(
    @requestBody({
      description: 'The input of create user function',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object' as const,
            properties: {
              user: {
                type: 'object' as const,
                properties: {
                  sName: {type: 'string'},
                  email: {type: 'string'},
                  nRole: {type: 'number'},
                  dCreation: {type: 'string'},
                },
              },
              password: {type: 'string'},
            },
          },
        },
      },
    })
    userCreate: {
      user: Users;
      password: string;
    },
  ) {
    return this.usersService.createUser(userCreate);
  }
}
