import { Body, Controller, ForbiddenException, Get, Patch, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QrService } from '../qr/qr.service';

@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly qrService: QrService,
  ) {}

  @Get()
  async getMenu(@Query('tableCode') tableCode?: string) {
    if (!tableCode) {
      throw new ForbiddenException('QR required');
    }
    const ok = await this.qrService.validateActiveSession(tableCode);
    if (!ok) {
      throw new ForbiddenException('QR session required');
    }
    return this.menuService.getMenu();
  }

  @Get('public')
  getPublicMenu() {
    return this.menuService.getMenuPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('all')
  getMenuAll() {
    return this.menuService.getMenuAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('items')
  createItem(@Body() dto: CreateItemDto) {
    return this.menuService.createItem(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.menuService.updateItem(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('items/:id/availability')
  setAvailability(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.menuService.setItemAvailability(id, body.isActive);
  }
}
