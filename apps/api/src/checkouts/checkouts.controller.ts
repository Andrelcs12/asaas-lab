import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckoutStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CorrelationId, CurrentUser, Roles } from '../common/decorators';
import { CheckoutsService } from './checkouts.service';

@ApiTags('checkouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checkouts')
export class CheckoutsController {
  constructor(private readonly checkoutsService: CheckoutsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: CheckoutStatus,
  ) {
    return this.checkoutsService.findAll(Number(page), Number(limit), { status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkoutsService.findOne(id);
  }

  @Post(':id/reconcile')
  @Roles(UserRole.ADMIN)
  reconcile(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.checkoutsService.reconcile(id, userId, correlationId);
  }
}
