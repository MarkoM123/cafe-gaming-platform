import { Body, Controller, Get, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';

@Controller()
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('games')
  listGames() {
    return this.gamesService.listGames();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('games/all')
  listGamesAll() {
    return this.gamesService.listGamesAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('games')
  createGame(@Body() dto: CreateGameDto) {
    return this.gamesService.createGame(dto.name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('games/:id')
  updateGame(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gamesService.updateGame(id, dto);
  }

  @Get('game-stations')
  listStations() {
    return this.gamesService.listStations();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get('game-stations/all')
  listStationsAll() {
    return this.gamesService.listStationsAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('game-stations')
  createStation(@Body() dto: CreateStationDto) {
    return this.gamesService.createStation(dto.name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('game-stations/:id')
  updateStation(@Param('id') id: string, @Body() dto: UpdateStationDto) {
    return this.gamesService.updateStation(id, dto);
  }
}
