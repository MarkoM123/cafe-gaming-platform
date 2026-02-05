import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('health/db')
  async getDbHealth() {
    try {
      await this.prisma.$executeRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch (error) {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
