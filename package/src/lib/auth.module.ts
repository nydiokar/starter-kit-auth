// Placeholder Nest module to illustrate packaging shape
import { Module, DynamicModule, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { AUTH_CONFIG, AUTH_MAILER, AUTH_PRISMA, AUTH_REDIS, AuthModuleOptions } from './tokens.js';
import { AuthService } from './auth/auth.service.js';
import { AuthController } from './auth/auth.controller.js';
import { SessionService } from './session/session.service.js';
import { SessionsController } from './session/sessions.controller.js';
import { MailerModule } from './mailer.module.js';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit/audit.service.js';
import { SessionGuard } from './session/session.guard.js';
import { RateLimitGuard } from './ratelimit/ratelimit.guard.js';
import { RolesGuard } from './rbac/roles.guard.js';

@Global()
@Module({
  imports: [MailerModule],
  providers: [Reflector, AuthService, SessionService, AuditService, SessionGuard, RateLimitGuard, RolesGuard],
  controllers: [AuthController, SessionsController],
  exports: [SessionService, SessionGuard, RateLimitGuard, RolesGuard],
})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      imports: [],
      providers: [
        { provide: AUTH_CONFIG, useValue: options },
        { provide: AUTH_REDIS, useFactory: () => {
          return new Redis(options.redis.url);
        }},
        // Allow custom mailer provider override via options.mailerProvider
        ...(options.mailerProvider ? [{ provide: AUTH_MAILER, ...(options.mailerProvider as any) }] : []),
      ],
      exports: [AUTH_CONFIG, AUTH_REDIS, Reflector, SessionService, SessionGuard, RateLimitGuard, RolesGuard],
    };
  }
}
