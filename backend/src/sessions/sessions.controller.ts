import { Controller, Patch, Query, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch('close')
  closeByTable(
    @Query('tableCode') tableCode?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.sessionsService.closeByTable(tableCode || '', {
      id: user?.sub,
      email: user?.email,
      role: user?.role,
    });
  }
}
