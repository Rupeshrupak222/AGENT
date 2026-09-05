import {
  Injectable, UnauthorizedException,
  ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt       from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
    private config:  ConfigService,
  ) {}

  // ── Register ────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    // Create tenant + admin user in a transaction
    const slug = dto.companyName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

    const result = await this.prisma.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug: `${slug}-${Date.now()}`,
          plan: 'starter',
        },
      });

      const hashed = await bcrypt.hash(dto.password, 12);
      const user   = await tx.user.create({
        data: {
          name:     dto.name,
          email:    dto.email,
          password: hashed,
          role:     'company_admin',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    const tokens = await this.generateTokens(result.user);
    this.logger.log(`New registration: ${dto.email} (tenant: ${result.tenant.id})`);
    return { ...tokens, user: this.sanitize(result.user), tenant: result.tenant };
  }

  // ── Login ───────────────────────────────────────────────────
  async login(dto: LoginDto) {
    if (!this.prisma.isConnected && this.config.get('NODE_ENV') !== 'production') {
      const email = dto.email.trim().toLowerCase();
      const isAcme = email === 'admin@acmecorp.com' && dto.password === 'Demo@1234';
      const isAgentCall = (email === 'admin@agentcall.ai' || email === 'admin@acmecorp.com') && (dto.password === 'admin123' || dto.password === 'Demo@1234');
      if (isAcme || isAgentCall) {
        const devUser = {
          id: 'cuid-dev-admin-user',
          name: 'Acme Admin (Dev)',
          email: email,
          role: 'company_admin',
          tenantId: 'cuid-dev-acme-tenant',
          isActive: true,
        };
        const devTenant = {
          id: 'cuid-dev-acme-tenant',
          name: 'Acme Corp (Demo)',
          slug: 'acme-corp-demo',
          plan: 'growth',
          isActive: true,
        };
        const tokens = await this.generateTokens(devUser);
        return { ...tokens, user: devUser, tenant: devTenant };
      }
      throw new UnauthorizedException('Invalid credentials. (Note: PostgreSQL is offline; use admin@acmecorp.com / Demo@1234 for dev)');
    }

    let user: any = null;
    try {
      user = await this.prisma.user.findUnique({
        where:   { email: dto.email },
        include: { tenant: true },
      });
    } catch (dbErr: any) {
      const isDbOffline =
        dbErr?.message?.includes("Can't reach database server") ||
        dbErr?.code === 'P1001' ||
        dbErr?.name === 'PrismaClientInitializationError';

      if (isDbOffline && this.config.get('NODE_ENV') !== 'production') {
        this.logger.warn(`PostgreSQL is offline (localhost:5432). Checking dev credentials for ${dto.email}`);
        if (dto.email === 'admin@acmecorp.com' && dto.password === 'Demo@1234') {
          const devUser = {
            id: 'cuid-dev-admin-user',
            name: 'Acme Admin (Dev)',
            email: 'admin@acmecorp.com',
            role: 'company_admin',
            tenantId: 'cuid-dev-acme-tenant',
            isActive: true,
          };
          const devTenant = {
            id: 'cuid-dev-acme-tenant',
            name: 'Acme Corp (Demo)',
            slug: 'acme-corp-demo',
            plan: 'growth',
            isActive: true,
          };
          const tokens = await this.generateTokens(devUser);
          return { ...tokens, user: devUser, tenant: devTenant };
        }
        throw new UnauthorizedException('Invalid credentials. (Note: PostgreSQL is offline; use admin@acmecorp.com / Demo@1234 for dev)');
      }
      throw dbErr;
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');
    if (!user.tenant?.isActive) throw new UnauthorizedException('Tenant account suspended');

    // Update last login
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => null);

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitize(user), tenant: user.tenant };
  }

  // ── Refresh ─────────────────────────────────────────────────
  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwt.verify(dto.refreshToken, {
        secret: this.refreshSecret(),
      }) as { sub: string };

      const user = await this.prisma.user.findUnique({
        where:   { id: payload.sub },
        include: { tenant: { select: { isActive: true } } },
      });

      if (!user || !user.isActive || !user.tenant?.isActive) throw new Error();
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Helpers ──────────────────────────────────────────────────
  private accessSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      if (this.isProduction()) {
        throw new Error('JWT_SECRET is required in production');
      }
      return 'adyapan-dev-jwt-secret-key-change-in-production-2026';
    }
    return secret;
  }

  private refreshSecret(): string {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      if (this.isProduction()) {
        throw new Error('JWT_REFRESH_SECRET is required in production');
      }
      return 'adyapan-dev-refresh-secret-key-change-in-production-2026';
    }
    return secret;
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  // ── Helpers ──────────────────────────────────────────────────
  private async generateTokens(user: { id: string; email: string; role: string; tenantId: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret:    this.accessSecret(),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
      }),
      this.jwt.signAsync(payload, {
        secret:    this.refreshSecret(),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
