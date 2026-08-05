import { Injectable } from '@nestjs/common';
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
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private customers = new Map<string, ProviderCustomer>();
  private payments = new Map<string, ProviderPayment>();
  private subscriptions = new Map<string, ProviderSubscription>();
  private checkouts = new Map<string, ProviderCheckout>();

  async createCustomer(input: CreateProviderCustomerInput): Promise<ProviderCustomer> {
    const customer: ProviderCustomer = {
      id: `cus_mock_${uuidv4().slice(0, 8)}`,
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async updateCustomer(
    providerCustomerId: string,
    input: UpdateProviderCustomerInput,
  ): Promise<ProviderCustomer> {
    const existing = this.customers.get(providerCustomerId)!;
    const updated = { ...existing, ...input };
    this.customers.set(providerCustomerId, updated);
    return updated;
  }

  async createPixCheckout(input: CreatePixCheckoutInput): Promise<ProviderCheckout> {
    return this.createCheckout(input);
  }

  async createCreditCardCheckout(input: CreateCreditCardCheckoutInput): Promise<ProviderCheckout> {
    return this.createCheckout(input);
  }

  async createRecurringCreditCardCheckout(
    input: CreateRecurringCheckoutInput,
  ): Promise<ProviderCheckout> {
    const subId = `sub_mock_${uuidv4().slice(0, 8)}`;
    this.subscriptions.set(subId, {
      id: subId,
      status: 'ACTIVE',
      value: input.amount,
      cycle: 'MONTHLY',
      nextDueDate: input.subscriptionStartDate,
      externalReference: input.externalReference,
    });
    return this.createCheckout(input);
  }

  private createCheckout(input: CreatePixCheckoutInput): ProviderCheckout {
    const checkout: ProviderCheckout = {
      id: `chk_mock_${uuidv4().slice(0, 8)}`,
      url: `https://sandbox.asaas.com/checkoutSession/show/mock-${uuidv4().slice(0, 8)}`,
      status: 'ACTIVE',
      externalReference: input.externalReference,
    };
    this.checkouts.set(checkout.id, checkout);
    this.payments.set(input.externalReference, {
      id: `pay_mock_${uuidv4().slice(0, 8)}`,
      status: 'PENDING',
      value: input.amount,
      externalReference: input.externalReference,
      dueDate: input.dueDate,
    });
    return checkout;
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const payment = this.payments.get(providerPaymentId);
    if (!payment) {
      for (const p of this.payments.values()) {
        if (p.id === providerPaymentId) return p;
      }
      return { id: providerPaymentId, status: 'PENDING', value: 0 };
    }
    return payment;
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    return (
      this.subscriptions.get(providerSubscriptionId) ?? {
        id: providerSubscriptionId,
        status: 'ACTIVE',
        value: 0,
        cycle: 'MONTHLY',
      }
    );
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(providerSubscriptionId);
    if (sub) this.subscriptions.set(providerSubscriptionId, { ...sub, status: 'INACTIVE' });
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(providerSubscriptionId);
    if (sub) this.subscriptions.set(providerSubscriptionId, { ...sub, status: 'ACTIVE' });
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(providerSubscriptionId);
    if (sub) this.subscriptions.set(providerSubscriptionId, { ...sub, status: 'EXPIRED' });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  simulatePaymentConfirm(externalReference: string) {
    for (const [key, payment] of this.payments.entries()) {
      if (payment.externalReference === externalReference || key === externalReference) {
        this.payments.set(key, { ...payment, status: 'CONFIRMED' });
      }
    }
  }
}
