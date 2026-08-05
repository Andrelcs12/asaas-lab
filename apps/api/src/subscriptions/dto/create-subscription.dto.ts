import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  internalNote?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CancelSubscriptionDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
