import {
  CustomerSyncStatus,
  InternalPaymentStatus,
  PaymentMethod,
  PaymentOrderStatus,
  PaymentOrderType,
  SubscriptionCycle,
  SubscriptionStatus,
  UserRole,
  WebhookEventStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('Lab@123456', 10);
  const viewerHash = await bcrypt.hash('Lab@123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lab.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@lab.local',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@lab.local' },
    update: {},
    create: {
      name: 'Visualizador',
      email: 'viewer@lab.local',
      passwordHash: viewerHash,
      role: UserRole.VIEWER,
    },
  });

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: '00000000-0000-4000-8000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'João Silva',
        email: 'joao@example.com',
        cpfCnpj: '24971563792',
        phone: '47999990001',
        syncStatus: CustomerSyncStatus.SYNCED,
        asaasCustomerId: 'cus_seed_001',
      },
    }),
    prisma.customer.upsert({
      where: { id: '00000000-0000-4000-8000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Maria Santos',
        email: 'maria@example.com',
        cpfCnpj: '98765432100',
        phone: '47999990002',
        syncStatus: CustomerSyncStatus.PENDING,
      },
    }),
    prisma.customer.upsert({
      where: { id: '00000000-0000-4000-8000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Empresa Lab LTDA',
        email: 'contato@empresalab.com',
        cpfCnpj: '12345678000199',
        phone: '4738010919',
        syncStatus: CustomerSyncStatus.SYNCED,
        asaasCustomerId: 'cus_seed_002',
      },
    }),
  ]);

  const orderPending1 = await prisma.paymentOrder.create({
    data: {
      customerId: customers[0].id,
      createdById: admin.id,
      description: 'Pagamento PIX de demonstração',
      type: PaymentOrderType.ONE_TIME,
      method: PaymentMethod.PIX,
      amount: 150.0,
      externalReference: 'payment_order_seed_001',
      status: PaymentOrderStatus.CHECKOUT_CREATED,
      checkoutUrl: 'https://sandbox.asaas.com/checkoutSession/show/seed-001',
      dueDate: new Date(Date.now() + 7 * 86400000),
    },
  });

  const orderPending2 = await prisma.paymentOrder.create({
    data: {
      customerId: customers[0].id,
      createdById: admin.id,
      description: 'Pagamento cartão de demonstração',
      type: PaymentOrderType.ONE_TIME,
      method: PaymentMethod.CREDIT_CARD,
      amount: 299.9,
      externalReference: 'payment_order_seed_002',
      status: PaymentOrderStatus.CHECKOUT_CREATED,
      checkoutUrl: 'https://sandbox.asaas.com/checkoutSession/show/seed-002',
      dueDate: new Date(Date.now() + 3 * 86400000),
    },
  });

  await prisma.payment.create({
    data: {
      customerId: customers[0].id,
      paymentOrderId: orderPending1.id,
      asaasPaymentId: 'pay_seed_confirmed',
      externalReference: orderPending1.externalReference,
      billingType: PaymentMethod.PIX,
      asaasStatus: 'CONFIRMED',
      internalStatus: InternalPaymentStatus.CONFIRMED,
      value: 150.0,
      netValue: 147.5,
      dueDate: new Date(),
      confirmedDate: new Date(),
    },
  });

  await prisma.payment.create({
    data: {
      customerId: customers[0].id,
      paymentOrderId: orderPending2.id,
      externalReference: orderPending2.externalReference,
      billingType: PaymentMethod.CREDIT_CARD,
      asaasStatus: 'PENDING',
      internalStatus: InternalPaymentStatus.PENDING,
      value: 299.9,
      dueDate: new Date(Date.now() + 3 * 86400000),
    },
  });

  const activeSub = await prisma.subscription.create({
    data: {
      customerId: customers[2].id,
      createdById: admin.id,
      description: 'Assinatura mensal Lab Pro',
      externalReference: 'subscription_seed_active',
      asaasSubscriptionId: 'sub_seed_active',
      cycle: SubscriptionCycle.MONTHLY,
      amount: 99.9,
      status: SubscriptionStatus.ACTIVE,
      asaasStatus: 'ACTIVE',
      nextDueDate: new Date(Date.now() + 30 * 86400000),
    },
  });

  await prisma.subscription.create({
    data: {
      customerId: customers[2].id,
      createdById: admin.id,
      description: 'Assinatura pausada Lab Basic',
      externalReference: 'subscription_seed_paused',
      asaasSubscriptionId: 'sub_seed_paused',
      cycle: SubscriptionCycle.MONTHLY,
      amount: 49.9,
      status: SubscriptionStatus.PAUSED,
      asaasStatus: 'INACTIVE',
      pausedAt: new Date(),
    },
  });

  await prisma.payment.create({
    data: {
      customerId: customers[2].id,
      subscriptionId: activeSub.id,
      asaasPaymentId: 'pay_seed_sub_001',
      billingType: PaymentMethod.CREDIT_CARD,
      asaasStatus: 'CONFIRMED',
      internalStatus: InternalPaymentStatus.CONFIRMED,
      value: 99.9,
      renewalNumber: 1,
      confirmedDate: new Date(),
    },
  });

  await prisma.webhookEvent.createMany({
    data: [
      {
        asaasEventId: 'evt_seed_payment_confirmed',
        eventType: 'PAYMENT_CONFIRMED',
        resourceType: 'PAYMENT',
        resourceId: 'pay_seed_confirmed',
        payload: { id: 'evt_seed_payment_confirmed', event: 'PAYMENT_CONFIRMED' },
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
      {
        asaasEventId: 'evt_seed_subscription_created',
        eventType: 'SUBSCRIPTION_CREATED',
        resourceType: 'SUBSCRIPTION',
        resourceId: 'sub_seed_active',
        payload: { id: 'evt_seed_subscription_created', event: 'SUBSCRIPTION_CREATED' },
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
      {
        asaasEventId: 'evt_seed_failed',
        eventType: 'PAYMENT_OVERDUE',
        resourceType: 'PAYMENT',
        resourceId: 'pay_seed_overdue',
        payload: { id: 'evt_seed_failed', event: 'PAYMENT_OVERDUE' },
        status: WebhookEventStatus.FAILED,
        attempts: 3,
        lastError: 'Cliente não encontrado (dados fictícios de seed)',
      },
    ],
  });

  console.log('Seed concluído.');
  console.log('Admin: admin@lab.local / Lab@123456');
  console.log('Viewer: viewer@lab.local / Lab@123456');
  console.log('NOTA: Dados de seed são fictícios e não representam integração real com o Asaas.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
