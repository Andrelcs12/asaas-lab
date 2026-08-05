import type { ProductDto } from '@/features/products/types';
import type { CheckoutFlow } from './checkout-flow.service';

export function filterProductsByFlow(products: ProductDto[], flow: CheckoutFlow): ProductDto[] {
  if (flow === 'subscription') {
    return products.filter((p) => p.type === 'SUBSCRIPTION');
  }
  return products.filter((p) => p.type === 'ONE_TIME');
}

export function buildCheckoutPayload(
  customerId: string,
  productId: string,
  dueDate: string,
): { customerId: string; productId: string; dueDate: string; startDate: string; idempotencyKey: string } {
  return {
    customerId,
    productId,
    dueDate,
    startDate: dueDate,
    idempotencyKey: `${Date.now()}-${customerId}-${productId}`,
  };
}
