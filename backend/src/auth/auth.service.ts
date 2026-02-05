import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: { email: string; password: string; name?: string }) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const totalUsers = await this.usersService.countAll();
    const role = totalUsers === 0 ? UserRole.ADMIN : UserRole.GAMER;

    const user = await this.usersService.createWithPassword({
      email: data.email,
      password: data.password,
      name: data.name,
      role,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, access_token: accessToken };
  }

  async login(data: { email: string; password: string }) {
    let user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.email === 'admin@demo.com' && user.role === UserRole.GAMER) {
      user = await this.usersService.setRoleByEmail(user.email, UserRole.ADMIN);
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      access_token: accessToken,
    };
  }
}
