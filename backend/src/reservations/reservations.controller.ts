import { Body, Controller, Get, Patch, Post, Query, UseGuards, Param } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() dto: CreateReservationDto) {
    return this.reservationsService.create(dto);
  }

  @Get()
  list(
    @Query('stationId') stationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reservationsService.list({ stationId, from, to });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('top-games')
  topGames(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    return this.reservationsService.topGames(from, to, parsed);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/archive')
  archive(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.reservationsService.archiveReservation(id, {
      id: user?.sub,
      email: user?.email,
      role: user?.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post('start-game')
  startGame(
    @Body()
    body: {
      stationId: string;
      gameId?: string;
      durationMinutes?: number;
      customerName?: string;
      customerPhone?: string;
    },
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.reservationsService.startGame(body, {
      id: user?.sub,
      email: user?.email,
      role: user?.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Post(':id/stop-game')
  stopGame(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.reservationsService.stopGame(id, {
      id: user?.sub,
      email: user?.email,
      role: user?.role,
    });
  }
}
