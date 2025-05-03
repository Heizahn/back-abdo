import {JWTService, TokenServiceBindings} from '@loopback/authentication-jwt';
import {BindingScope, inject, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {compare, genSalt, hash} from 'bcryptjs';
import mongoose from 'mongoose';
import {DbAbdo77DataSource} from '../datasources';
import {Credentials} from '../interfaces/users';
import {Users} from '../models';
import {UsersRepository} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class UsersService {
  constructor(
    @repository(UsersRepository)
    private usersRepository: UsersRepository,
    @inject('datasources.dbABDO77')
    private dataSource: DbAbdo77DataSource,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    private jwtService: JWTService,
  ) {}

  async createUser({user, password}: {user: Users; password: string}) {
    if (password.length < 8) {
      throw new HttpErrors.BadRequest(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }

    const userExists = await this.usersRepository.findOne({
      where: {
        email: user.email,
      },
    });

    console.log(userExists);

    if (userExists) {
      throw new HttpErrors.BadRequest('Usuario ya existe');
    }

    const newUser = await this.usersRepository.create(user);

    await this.dataSource.connector?.collection('UserCredentials').insertOne({
      userId: newUser.id?.toString(),
      password: await hash(password, await genSalt()),
    });

    return newUser;
  }

  async login(credentials: Credentials) {
    const user = await this.usersRepository.findOne({
      where: {
        email: credentials.email,
        nRole: {
          neq: -1,
        },
      },
    });

    const objectId: {id: string} = user?.getIdObject() as {id: string};

    if (!user) {
      throw new HttpErrors.Unauthorized('Usuario no encontrado');
    }

    const userCredentialCollection = this.dataSource.connector?.collection(
      'UserCredentials',
    ) as mongoose.Collection;

    const userCredentials =
      (await userCredentialCollection.findOne({
        userId: objectId.id,
      })) ??
      (await userCredentialCollection.findOne({
        userId: mongoose.Types.ObjectId.createFromHexString(objectId.id),
      }));

    if (!userCredentials) {
      throw new HttpErrors.Unauthorized('Usuario no tiene credenciales');
    }

    const isPasswordValid = await compare(
      credentials.password,
      userCredentials.password,
    );

    if (!isPasswordValid) {
      throw new HttpErrors.Unauthorized('Credenciales incorrectas');
    }

    return {
      token: await this.generateToken(user),
    };
  }

  async getUserMe(authorization: string) {
    const token = authorization.split(' ')[1];
    const userId = await this.idUserToken(token);

    if (!userId) {
      throw new HttpErrors.Unauthorized('Token inválido');
    }

    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new HttpErrors.Unauthorized('Usuario no encontrado');
    }
    return user;
  }

  async getProviders() {
    const providers = await this.usersRepository.find({
      where: {
        nRole: 3,
      },
    });

    return providers.map(provider => ({
      id: provider.id,
      tag: `ABDO77-${provider.nTag}`,
    }));
  }

  async getUsersList() {
    const users = await this.usersRepository.find({
      where: {
        nRole: {
          neq: -1,
        },
        visible: {
          neq: false,
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      name: user.sName,
    }));
  }

  async generateToken(user: Users) {
    if (!user?.id) {
      throw new HttpErrors.Unauthorized('Usuario no encontrado');
    }

    const userProfile: UserProfile = {
      [securityId]: user.id,
      name: user.sName,
    };

    const token = await this.jwtService.generateToken(userProfile);

    return token;
  }

  async refreshToken(token: string) {
    try {
      const userId = await this.idUserToken(token);
      const user = await this.usersRepository.findById(userId);

      if (!user) {
        throw new HttpErrors.Unauthorized('Usuario no encontrado');
      }

      return {
        token: await this.generateToken(user),
      };
    } catch (error) {
      throw new HttpErrors.Unauthorized('Token inválido');
    }
  }

  async idUserToken(token: string) {
    const decoded = await this.jwtService.verifyToken(token);
    return decoded[securityId];
  }
}
