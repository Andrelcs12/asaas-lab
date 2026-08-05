import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createCustomerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    cpfCnpj: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    cpfCnpj: string;
    phone?: string | undefined;
    address?: string | undefined;
}, {
    email: string;
    name: string;
    cpfCnpj: string;
    phone?: string | undefined;
    address?: string | undefined;
}>;
export declare const updateCustomerSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    cpfCnpj: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    name?: string | undefined;
    cpfCnpj?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}, {
    email?: string | undefined;
    name?: string | undefined;
    cpfCnpj?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
}>;
export declare const createPixPaymentSchema: z.ZodObject<{
    customerId: z.ZodString;
    description: z.ZodString;
    amount: z.ZodNumber;
    dueDate: z.ZodUnion<[z.ZodString, z.ZodString]>;
    internalNote: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    description: string;
    amount: number;
    dueDate: string;
    internalNote?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    customerId: string;
    description: string;
    amount: number;
    dueDate: string;
    internalNote?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export declare const createCreditCardPaymentSchema: z.ZodObject<{
    customerId: z.ZodString;
    description: z.ZodString;
    amount: z.ZodNumber;
    dueDate: z.ZodUnion<[z.ZodString, z.ZodString]>;
    internalNote: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    description: string;
    amount: number;
    dueDate: string;
    internalNote?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    customerId: string;
    description: string;
    amount: number;
    dueDate: string;
    internalNote?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export declare const createMonthlySubscriptionSchema: z.ZodObject<{
    customerId: z.ZodString;
    description: z.ZodString;
    amount: z.ZodNumber;
    startDate: z.ZodString;
    internalNote: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    description: string;
    amount: number;
    startDate: string;
    internalNote?: string | undefined;
    idempotencyKey?: string | undefined;
}, {
    customerId: string;
    description: string;
    amount: number;
    startDate: string;
    internalNote?: string | undefined;
    idempotencyKey?: string | undefined;
}>;
export declare const cancelSubscriptionSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreatePixPaymentInput = z.infer<typeof createPixPaymentSchema>;
export type CreateCreditCardPaymentInput = z.infer<typeof createCreditCardPaymentSchema>;
export type CreateMonthlySubscriptionInput = z.infer<typeof createMonthlySubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
