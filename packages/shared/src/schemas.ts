import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(18),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createPixPaymentSchema = z.object({
  customerId: z.string().uuid(),
  description: z.string().min(3),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()),
  internalNote: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const createCreditCardPaymentSchema = createPixPaymentSchema;

export const createMonthlySubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  description: z.string().min(3),
  amount: z.number().positive(),
  startDate: z.string().date(),
  internalNote: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().min(3, 'Informe o motivo do cancelamento'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreatePixPaymentInput = z.infer<typeof createPixPaymentSchema>;
export type CreateCreditCardPaymentInput = z.infer<typeof createCreditCardPaymentSchema>;
export type CreateMonthlySubscriptionInput = z.infer<typeof createMonthlySubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
