import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CorrelationId, CurrentUser, Roles } from '../common/decorators';
import { CancelSubscriptionDto, CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly service: SubscriptionsService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Post('monthly')
  @Roles(UserRole.ADMIN)
  createMonthly(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.createMonthly(dto, userId, correlationId);
  }

  @Get()
  findAll(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findAll(Number(page), Number(limit));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/pause')
  @Roles(UserRole.ADMIN)
  pause(@Param('id') id: string, @CurrentUser('id') userId: string, @CorrelationId() correlationId: string) {
    return this.service.pause(id, userId, correlationId);
  }

  @Post(':id/resume')
  @Roles(UserRole.ADMIN)
  resume(@Param('id') id: string, @CurrentUser('id') userId: string, @CorrelationId() correlationId: string) {
    return this.service.resume(id, userId, correlationId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.service.cancel(id, dto.reason, userId, correlationId);
  }

  @Post(':id/reconcile')
  @Roles(UserRole.ADMIN)
  reconcile(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.reconciliationService.reconcileSubscription(id, userId, correlationId);
  }
}
