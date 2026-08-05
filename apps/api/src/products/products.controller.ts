import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductType, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CorrelationId, CurrentUser, Roles } from '../common/decorators';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.productsService.create(dto, userId, correlationId);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: ProductType,
    @Query('isActive') isActive?: string,
  ) {
    return this.productsService.findAll(Number(page), Number(limit), {
      type,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') userId: string,
    @CorrelationId() correlationId: string,
  ) {
    return this.productsService.update(id, dto, userId, correlationId);
  }
}
