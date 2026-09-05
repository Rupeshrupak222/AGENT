import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }                  from '@nestjs/passport';
import { ExtractJwt, Strategy }              from 'passport-jwt';
import { ConfigService }                     from '@nestjs/config';
import { PrismaService }                     from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      JwtStrategy.resolveSecret(config),
    });
  }

  private static resolveSecret(config: ConfigService): string {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      if (config.get<string>('NODE_ENV') === 'production') {
        throw new Error('JWT_SECRET is required in production');
      }
      return 'adyapan-dev-jwt-secret-key-change-in-production-2026';
    }
    return secret;
  }

  async validate(payload: { sub: string; email: string; tenantId: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where:   { id: payload.sub },
      include: { tenant: { select: { id: true, name: true, plan: true, isActive: true } } },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');
    if (!user.tenant.isActive)   throw new UnauthorizedException('Tenant account suspended');

    return {
      id:       user.id,
      email:    user.email,
      name:     user.name,
      role:     user.role,
      tenantId: user.tenantId,
      tenant:   user.tenant,
    };
  }
}