import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  listGames() {
    return this.prisma.game.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listGamesAll() {
    return this.prisma.game.findMany({
      orderBy: { name: 'asc' },
    });
  }

  createGame(name: string) {
    return this.prisma.game.create({ data: { name } });
  }

  updateGame(
    id: string,
    data: { name?: string; isActive?: boolean },
  ) {
    return this.prisma.game.update({
      where: { id },
      data,
    });
  }

  listStations() {
    return this.prisma.gameStation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listStationsAll() {
    return this.prisma.gameStation.findMany({
      orderBy: { name: 'asc' },
    });
  }

  createStation(name: string) {
    return this.prisma.gameStation.create({ data: { name } });
  }

  updateStation(
    id: string,
    data: { name?: string; isActive?: boolean },
  ) {
    return this.prisma.gameStation.update({
      where: { id },
      data,
    });
  }
}
