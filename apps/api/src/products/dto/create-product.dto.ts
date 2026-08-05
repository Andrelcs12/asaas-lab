import { ProductBillingCycle, ProductType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(5)
  description!: string;

  @IsEnum(ProductType)
  type!: ProductType;

  @IsNumber()
  @Min(0.01)
  price!: number;

  @IsEnum(ProductBillingCycle)
  @IsOptional()
  billingCycle?: ProductBillingCycle;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProductDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(5)
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
