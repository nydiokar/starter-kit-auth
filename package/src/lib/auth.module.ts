// Placeholder Nest module to illustrate packaging shape
import { Module, DynamicModule } from '@nestjs/common';
import Redis from 'ioredis';
import { AUTH_CONFIG, AUTH_PRISMA, AUTH_REDIS, AuthModuleOptions } from './tokens';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { SessionService } from './session/session.service';
import { SessionsController } from './session/sessions.controller';
import { MailerModule } from './mailer.module';
import { AuditService } from './audit/audit.service';
import { SessionGuard } from './session/session.guard';
import { RateLimitModule } from './ratelimit.module';
import { RbacModule } from './rbac.module';

@Module({
  imports: [MailerModule, RateLimitModule, RbacModule],
  providers: [AuthService, SessionService, AuditService, SessionGuard],
  controllers: [AuthController, SessionsController],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        { provide: AUTH_CONFIG, useValue: options },
        { provide: AUTH_REDIS, useFactory: () => new Redis(options.redis.url) },
      ],
      exports: [AUTH_CONFIG, AUTH_REDIS, SessionService, SessionGuard],
    };
  }
}
