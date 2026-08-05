import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { PaymentOrdersService } from './payment-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CorrelationId, CurrentUser, Roles } from '../common/decorators';

class CreatePaymentOrderDto {
  @IsUUID() customerId!: string;
  @IsString() @MinLength(3) description!: string;
  @IsNumber() @Min(0.01) amount!: number;
  @IsString() dueDate!: string;
  @IsOptional() @IsString() internalNote?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
}

@ApiTags('payment-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment-orders')
export class PaymentOrdersController {
  constructor(private readonly service: PaymentOrdersService) {}

  @Post('pix')
  @Roles(UserRole.ADMIN)
  createPix(
    @Body() dto: CreatePaymentOrderDto,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.createPix(dto, userId, correlationId);
  }

  @Post('credit-card')
  @Roles(UserRole.ADMIN)
  createCreditCard(
    @Body() dto: CreatePaymentOrderDto,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.createCreditCard(dto, userId, correlationId);
  }

  @Get()
  findAll(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findAll(Number(page), Number(limit));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
