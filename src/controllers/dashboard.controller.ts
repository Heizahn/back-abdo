import {inject} from '@loopback/core';
import {get} from '@loopback/rest';
import {DashboardService} from '../services';

export class DashboardController {
  constructor(
    @inject('services.DashboardService')
    private dashboardService: DashboardService,
  ) {}

  @get('/dashboard/payments/last')
  async latestPayments() {
    return this.dashboardService.latestPayments();
  }

  @get('dashboard/payments/monthly/collection')
  async monthlyCollection() {
    return this.dashboardService.monthlyCollection();
  }

  @get('dashboard/clients/status')
  async clientsStatus() {
    return this.dashboardService.clientsStatus();
  }

  @get('dashboard/payments/chart')
  async paymentsChart() {
    return this.dashboardService.paymentsChartCollection();
  }
}
