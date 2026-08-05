"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelSubscriptionSchema = exports.createMonthlySubscriptionSchema = exports.createCreditCardPaymentSchema = exports.createPixPaymentSchema = exports.updateCustomerSchema = exports.createCustomerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('E-mail inválido'),
    password: zod_1.z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});
exports.createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome obrigatório'),
    email: zod_1.z.string().email('E-mail inválido'),
    cpfCnpj: zod_1.z.string().min(11, 'CPF/CNPJ inválido').max(18),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
});
exports.updateCustomerSchema = exports.createCustomerSchema.partial();
exports.createPixPaymentSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid(),
    description: zod_1.z.string().min(3),
    amount: zod_1.z.number().positive('Valor deve ser positivo'),
    dueDate: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().date()),
    internalNote: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string().optional(),
});
exports.createCreditCardPaymentSchema = exports.createPixPaymentSchema;
exports.createMonthlySubscriptionSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid(),
    description: zod_1.z.string().min(3),
    amount: zod_1.z.number().positive(),
    startDate: zod_1.z.string().date(),
    internalNote: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string().optional(),
});
exports.cancelSubscriptionSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3, 'Informe o motivo do cancelamento'),
});
//# sourceMappingURL=schemas.js.map