import { Injectable, Logger } from '@nestjs/common';
import {
  CreateCreditCardCheckoutInput,
  CreatePixCheckoutInput,
  CreateProviderCustomerInput,
  CreateRecurringCheckoutInput,
  PaymentProvider,
  ProviderCheckout,
  ProviderCustomer,
  ProviderPayment,
  ProviderSubscription,
  UpdateProviderCustomerInput,
} from '@asaas-lab/shared';
import { AsaasHttpClient } from './asaas-http.client';
import { AppConfigService } from '../common/config/app-config.service';

interface AsaasCustomerResponse {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

interface AsaasCheckoutResponse {
  id: string;
  link: string;
  status: string;
}

interface AsaasPaymentResponse {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  dueDate?: string;
  paymentDate?: string;
  confirmedDate?: string;
  creditDate?: string;
  billingType?: string;
  externalReference?: string;
  invoiceUrl?: string;
  subscription?: string;
}

interface AsaasSubscriptionResponse {
  id: string;
  status: string;
  value: number;
  cycle: string;
  nextDueDate?: string;
  externalReference?: string;
}

@Injectable()
export class AsaasPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(AsaasPaymentProvider.name);

  constructor(
    private readonly http: AsaasHttpClient,
    private readonly config: AppConfigService,
  ) {}

  async createCustomer(input: CreateProviderCustomerInput): Promise<ProviderCustomer> {
    const data = await this.http.request<AsaasCustomerResponse>('POST', '/customers', {
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
      phone: input.phone?.replace(/\D/g, ''),
      externalReference: input.externalReference,
    });
    return { id: data.id, name: data.name, email: data.email, cpfCnpj: data.cpfCnpj };
  }

  async updateCustomer(
    providerCustomerId: string,
    input: UpdateProviderCustomerInput,
  ): Promise<ProviderCustomer> {
    const data = await this.http.request<AsaasCustomerResponse>(
      'PUT',
      `/customers/${providerCustomerId}`,
      input,
    );
    return { id: data.id, name: data.name, email: data.email, cpfCnpj: data.cpfCnpj };
  }

  async createPixCheckout(input: CreatePixCheckoutInput): Promise<ProviderCheckout> {
    return this.createCheckout(input, ['PIX'], ['DETACHED']);
  }

  async createCreditCardCheckout(input: CreateCreditCardCheckoutInput): Promise<ProviderCheckout> {
    return this.createCheckout(input, ['CREDIT_CARD'], ['DETACHED']);
  }

  async createRecurringCreditCardCheckout(
    input: CreateRecurringCheckoutInput,
  ): Promise<ProviderCheckout> {
    const body = this.buildCheckoutBody(input, ['CREDIT_CARD'], ['RECURRENT'], {
      subscription: {
        cycle: 'MONTHLY',
        nextDueDate: input.subscriptionStartDate,
      },
    });
    const data = await this.http.request<AsaasCheckoutResponse>('POST', '/checkouts', body);
    return {
      id: data.id,
      url: data.link,
      status: data.status,
      externalReference: input.externalReference,
    };
  }

  private async createCheckout(
    input: CreatePixCheckoutInput,
    billingTypes: string[],
    chargeTypes: string[],
  ): Promise<ProviderCheckout> {
    const body = this.buildCheckoutBody(input, billingTypes, chargeTypes);
    const data = await this.http.request<AsaasCheckoutResponse>('POST', '/checkouts', body);
    return {
      id: data.id,
      url: data.link,
      status: data.status,
      externalReference: input.externalReference,
    };
  }

  private buildCheckoutBody(
    input: CreatePixCheckoutInput,
    billingTypes: string[],
    chargeTypes: string[],
    extra?: Record<string, unknown>,
  ) {
    return {
      billingTypes,
      chargeTypes,
      minutesToExpire: 1440,
      externalReference: input.externalReference,
      callback: {
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        expiredUrl: input.expiredUrl,
      },
      items: [
        {
          name: input.description.slice(0, 100),
          description: input.description,
          quantity: 1,
          value: input.amount,
        },
      ],
      customerData: {
        name: input.customerData.name,
        email: input.customerData.email,
        cpfCnpj: input.customerData.cpfCnpj.replace(/\D/g, ''),
        phone: input.customerData.phone?.replace(/\D/g, ''),
      },
      ...extra,
    };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const data = await this.http.request<AsaasPaymentResponse>('GET', `/payments/${providerPaymentId}`);
    return this.mapPayment(data);
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const data = await this.http.request<AsaasSubscriptionResponse>(
      'GET',
      `/subscriptions/${providerSubscriptionId}`,
    );
    return {
      id: data.id,
      status: data.status,
      value: data.value,
      cycle: data.cycle,
      nextDueDate: data.nextDueDate,
      externalReference: data.externalReference,
    };
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<void> {
    await this.http.request('PUT', `/subscriptions/${providerSubscriptionId}`, {
      status: 'INACTIVE',
    });
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<void> {
    await this.http.request('PUT', `/subscriptions/${providerSubscriptionId}`, {
      status: 'ACTIVE',
    });
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.http.request('DELETE', `/subscriptions/${providerSubscriptionId}`);
  }

  async refundPayment(providerPaymentId: string, value?: number): Promise<ProviderPayment> {
    const body = value !== undefined ? { value } : {};
    const data = await this.http.request<AsaasPaymentResponse>(
      'POST',
      `/payments/${providerPaymentId}/refund`,
      body,
    );
    return this.mapPayment(data);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.asaasApiKey) return false;
    try {
      await this.http.request('GET', '/customers?limit=1');
      return true;
    } catch {
      return false;
    }
  }

  private mapPayment(data: AsaasPaymentResponse): ProviderPayment {
    return {
      id: data.id,
      status: data.status,
      value: data.value,
      netValue: data.netValue,
      dueDate: data.dueDate,
      paymentDate: data.paymentDate,
      confirmedDate: data.confirmedDate,
      creditDate: data.creditDate,
      billingType: data.billingType,
      externalReference: data.externalReference,
      invoiceUrl: data.invoiceUrl,
      subscription: data.subscription,
    };
  }
}
