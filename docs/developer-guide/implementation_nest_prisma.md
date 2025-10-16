Implementation: NestJS + Prisma (Reference)

Modules
- AuthModule: Controller (routes in docs/endpoints.md) + Service
- SessionModule: Redis-backed session store and cookie issuance
- CsrfModule: Middleware to enforce x-csrf-token for mutating requests
- RateLimitModule: Guard with sliding-window checks in Redis
- RbacModule: Roles guard and @RequireRole decorator
- MailerModule: Nodemailer SMTP integration
- AuditModule: Append-only audit log service

Prisma Models
- Use the models in the master plan (lean_auth_template_v_1_llm_ready.md §2).

Key Contracts
- SessionService.create(userId, req): creates session, issues cookie
- SessionService.revoke(sessionId), revokeAll(userId), get(sessionId), list(userId)
- MailerService.sendVerifyEmail(user, token), sendPasswordReset(user, token)
- AuditService.append(kind, userId?, req?, meta?)

DTOs (class-validator)
- register.dto.ts: email, password
- login.dto.ts: email, password
- request-verify.dto.ts: none
- verify-email.dto.ts: token
- request-reset.dto.ts: email
- reset-password.dto.ts: token, password

Security
- Argon2id + pepper from env (use argon2 package)
- Dummy hash verify when user not found
- CSRF double-submit cookie for cookie flows

Rate Limits (defaults)
- login: ip 10/min, account 5/5min
- register: ip 5/min
- request-verify: account 3/5min
- reset: account 3/5min

