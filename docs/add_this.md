Add This Module (as an npm dependency)

Goal
- Package the lean auth as a reusable Nest module you can install via npm instead of copying code.

Package Name (example)
- `@lean-kit/auth` (rename to your org scope)

What This Package Exposes
- Nest modules: `AuthModule`, `SessionModule`, `CsrfModule`, `RateLimitModule`, `RbacModule`, `MailerModule`, `AuditModule`
- Tokens/interfaces: inject your Prisma client via `AUTH_PRISMA` token; Redis created from URL
- Guards: `SessionGuard`, `RateLimitGuard`, `RolesGuard` (includes `Reflector` dependency)
- DTOs, controllers, guards, and services to wire endpoints quickly

Consumer Requirements
- Prisma schema augmented with the models from docs/overview.md (User, Session, etc.)
- A configured Redis instance
- SMTP credentials

Install (consumer project)
```
npm i @lean-kit/auth argon2 ioredis nodemailer
npm i -D @types/node @types/express @types/cookie @types/nodemailer typescript ts-node
```

AWS SES (optional)
- If you prefer SES, install the AWS SDK v3 module:
```
npm i @aws-sdk/client-ses
```

Wire Up (Nest root module)
```ts
import 'reflect-metadata';
import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AUTH_PRISMA, AUTH_MAILER, AuthModule, type MailerPort, SesMailerService } from '@lean-kit/auth';

@Global()
@Module({
  providers: [
    { provide: PrismaClient, useFactory: () => new PrismaClient() },
    { provide: AUTH_PRISMA, useExisting: PrismaClient },
  ],
  exports: [AUTH_PRISMA, PrismaClient],
})
export class PrismaModule {}

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRoot({
      redis: { url: process.env.REDIS_URL! },
      prisma: {}, // Required - AuthModule will inject AUTH_PRISMA from PrismaModule
      cookie: {
        name: process.env.SESSION_COOKIE_NAME!,
        domain: process.env.COOKIE_DOMAIN,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        ttlDays: Number(process.env.SESSION_TTL_DAYS || 7),
      },
      csrfCookieName: process.env.CSRF_COOKIE_NAME!,
      pepper: process.env.AUTH_PEPPER!,
      mailer: {
        from: process.env.MAIL_FROM!,
        smtp: {
          host: process.env.SMTP_HOST!,
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
        frontendUrl: process.env.FRONTEND_URL!,
      },
      // Optional: override mailer implementation
      // Nodemailer is default; to use AWS SES instead:
      // mailerProvider: { provide: AUTH_MAILER, useClass: SesMailerService as unknown as new (...args:any[]) => MailerPort },
    }),
  ],
})
export class AppModule {}
```

If you have a `PrismaService extends PrismaClient`, provide it like:
```ts
providers: [PrismaService, { provide: AUTH_PRISMA, useExisting: PrismaService }]
```

Prisma
- Add models from `auth_module/lean_auth_template_v_1_llm_ready.md §2` to your schema
- Run `prisma migrate dev` (or equivalent) to create tables

Environment
- See `auth_module/config/.env.example` and copy values into your app

Global Guards/Middleware
- Register `SessionGuard` globally or per-route
- Apply `CsrfMiddleware` to mutating routes using cookies
- Use `RateLimitGuard` on login/register/verify/reset endpoints

RBAC
- Seed roles `user` and `admin`; use `@RequireRole('admin')` on admin routes

Testing
- Use `auth_module/examples/http/requests.http` with a REST client supporting cookies

Publishing (maintainer)
- Build with `tsc` or `tsup`; publish `dist`
- Keep Prisma models in docs; package only ships code (no migrations)
- Version via semver; document breaking changes to contracts
