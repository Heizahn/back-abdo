import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import mongoose from 'mongoose';
import {PaymentsRepository} from '../repositories/payments.repository';

@injectable({scope: BindingScope.TRANSIENT})
export class UtilsService {
  constructor(
    @repository(PaymentsRepository)
    private paymentsRepository: PaymentsRepository,
  ) {}

  /**
   * Valida si un cliente existe y si el proveedor tiene acceso a él
   * @param idClient ID del cliente a validar
   * @param idProvider ID del proveedor (opcional)
   * @returns Retorna el cliente si existe y el proveedor tiene acceso
   * @throws HttpErrors.BadRequest si el ID del cliente es inválido
   * @throws HttpErrors.NotFound si el cliente no existe
   * @throws HttpErrors.Forbidden si el proveedor no tiene acceso al cliente
   */
  async validateClientAccess(idClient: string, idProvider?: string) {
    const ObjectId = mongoose.Types.ObjectId;

    if (!ObjectId.isValid(idClient)) {
      throw new HttpErrors.BadRequest('Id del cliente inválido');
    }

    const baseClient = (await this.paymentsRepository.dataSource.connector
      ?.collection('Clients')
      .findOne(
        {_id: new ObjectId(idClient)},
        {projection: {idOwner: 1, sName: 1}}, // Efficiently fetch minimal data
      )) as {
      _id: mongoose.Types.ObjectId;
      idOwner?: mongoose.Types.ObjectId | string;
      sName: string;
    } | null;

    if (!baseClient) {
      throw new HttpErrors.NotFound('Cliente no encontrado');
    }

    if (idProvider) {
      const dbProviderId = baseClient.idOwner
        ? baseClient.idOwner.toString()
        : undefined;

      if (dbProviderId !== idProvider) {
        throw new HttpErrors.Forbidden('Acceso denegado a este cliente');
      }
    }

    return baseClient;
  }
}
