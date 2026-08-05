-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('ONE_TIME', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ProductBillingCycle" AS ENUM ('NONE', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CheckoutType" AS ENUM ('PIX_ONE_TIME', 'CREDIT_CARD_ONE_TIME', 'CREDIT_CARD_SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('CREATING', 'CREATED', 'OPENED', 'PROCESSING', 'COMPLETED', 'EXPIRED', 'CANCELED', 'FAILED');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "billingCycle" "ProductBillingCycle" NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT,
    "subscriptionId" TEXT,
    "asaasCheckoutId" TEXT,
    "checkoutUrl" TEXT,
    "type" "CheckoutType" NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'CREATING',
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN "productId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "productId" TEXT;

-- CreateIndex
CREATE INDEX "Product_type_idx" ON "Product"("type");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_paymentOrderId_key" ON "Checkout"("paymentOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_subscriptionId_key" ON "Checkout"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_asaasCheckoutId_key" ON "Checkout"("asaasCheckoutId");

-- CreateIndex
CREATE INDEX "Checkout_status_idx" ON "Checkout"("status");

-- CreateIndex
CREATE INDEX "Checkout_asaasCheckoutId_idx" ON "Checkout"("asaasCheckoutId");

-- CreateIndex
CREATE INDEX "PaymentOrder_productId_idx" ON "PaymentOrder"("productId");

-- CreateIndex
CREATE INDEX "Subscription_productId_idx" ON "Subscription"("productId");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
