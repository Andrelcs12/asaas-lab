import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CorrelationId, CurrentUser, Roles } from '../common/decorators';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.paymentsService.findAll(Number(page), Number(limit), {
      status: status as never,
      customerId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.paymentsService.getStatus(id);
  }

  @Post(':id/reconcile')
  @Roles(UserRole.ADMIN)
  reconcile(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.paymentsService.reconcile(id, userId, correlationId);
  }

  @Post(':id/refund')
  @Roles(UserRole.ADMIN)
  refund(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.paymentsService.refund(id, dto.value, userId, correlationId);
  }
}
