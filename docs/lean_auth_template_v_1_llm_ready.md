# Lean Auth Template — V1 (LLM‑ready, Modular)

Purpose: reproducible custom authentication/authorization baseline without enterprise bloat. Stack defaults: **NestJS (Express)**, **Prisma + Postgres**, **Redis**, **Next.js** frontend. Security target: OWASP ASVS L1+; production‑safe.

---

## Build Status (V1)
- Implemented: SessionModule, AuthModule, CsrfModule, RateLimitModule, RolesModule (RBAC), MailerModule, AuditModule; controllers, DTOs, and guards; packaging skeleton.
- Pending: formal test suite; example consumer app + minimal Next.js frontend; HIBP breach check (documented; not implemented in package).

## 0) Scope and Non‑Goals
**In**: email+password, email verification, password reset, opaque cookie sessions, CSRF for cookie flows, RBAC, basic rate limiting, audit log, demo user mode.
**Out (defer)**: MFA, social login, orgs/teams, OAuth provider, hardware tokens, JWKS rotation, device fingerprinting, DSR automation.

---

## 1) Modules (files & responsibilities)
- **AuthModule**: controller + service for register/login/logout/me, email verify, password reset.
- **SessionModule**: server‑side session store (Redis), cookie issuance, revocation.
- **RateLimitModule**: per‑IP and per‑account sliding window.
- **CsrfModule**: double‑submit token for state‑changing requests in cookie mode.
- **RolesModule**: RBAC tables, guards (`RequireRole`).
- **AuditModule**: append‑only auth event log.
- **MailerModule**: transactional email for verification and reset.

Directory skeleton (Nest):
```
src/
  auth/
    auth.controller.ts
    auth.service.ts
    dto/
      register.dto.ts
      login.dto.ts
      request-verify.dto.ts
      verify-email.dto.ts
      request-reset.dto.ts
      reset-password.dto.ts
  session/
    session.service.ts
    session.guard.ts
  rbac/
    roles.guard.ts
    roles.decorator.ts
  csrf/
    csrf.middleware.ts
  ratelimit/
    ratelimit.guard.ts
  audit/
    audit.service.ts
  mailer/
    mailer.service.ts
  common/
    crypto.ts
    errors.ts
```

---

## 2) Data Model (Prisma)
```prisma
model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  emailVerifiedAt    DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  isActive           Boolean  @default(true)
  // relations
  password           PasswordCredential?
  sessions           Session[]
  roles              UserRole[]
}

model PasswordCredential {
  userId    String  @id
  hash      String
  algo      String  // "argon2id" or "bcrypt12"
  createdAt DateTime @default(now())
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id         String  @id // random 32B base64url
  userId     String
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  ipHash     String
  userAgent  String
  revokedAt  DateTime?
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique // hash of 32B token
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Role {
  id    String @id @default(cuid())
  name  String @unique // e.g., "user", "admin"
}

model UserRole {
  userId String
  roleId String
  assignedAt DateTime @default(now())
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}

model AuditLog {
  id        String   @id @default(cuid())
  at        DateTime @default(now())
  userId    String?
  ip        String?
  ua        String?
  kind      String   // LOGIN_SUCCESS, LOGIN_FAIL, REGISTER, LOGOUT, VERIFY_SENT, VERIFY_OK, RESET_REQ, RESET_OK
  meta      Json?
}
```

---

## 3) Environment & Secrets
```
# secrets
AUTH_PEPPER=long-random-string
SESSION_COOKIE_NAME=analyzer.sid
CSRF_COOKIE_NAME=analyzer.csrf
SESSION_TTL_DAYS=7
ARGON2_MEMORY=19456
ARGON2_ITERATIONS=2
ARGON2_PARALLELISM=1
# mail
MAIL_FROM="Sova Intel <no-reply@sova.local>"
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

---

## 4) Session Model (minimal, robust)
**Opaque server session (recommended for V1):**
- On login, generate `sessionId = base64url(random(32))`.
- Set HttpOnly, Secure, SameSite=Strict cookie with sessionId.
- Store Redis key `sess:{sessionId}` → `{ userId, ipHash, ua, createdAt, expiresAt }` with TTL.
- Guard reads cookie, loads user by `sessionId`, denies if missing/expired/revoked.
- Logout deletes Redis key and DB row; “Logout all” deletes all rows by `userId`.

Cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, `Max-Age` = TTL seconds.

---

## 5) Passwords
- Use **Argon2id** with per‑user random salt and global **pepper** from env.
- Registration flow: normalize email, enforce length and composition policy, HIBP k‑anon breach check.
- Timing‑safe checks: always verify against a dummy hash if user not found to avoid enumeration.

Pseudo:
```ts
const hash = argon2id.hash( password + PEPPER, { m: ARGON2_MEMORY, t: ARGON2_ITERATIONS, p: ARGON2_PARALLELISM } );
const ok = await argon2id.verify(storedHash, password + PEPPER);
```

---

## 6) CSRF (cookie flows only)
- On first GET to app, set `csrf` cookie with random 32B base64url.
- For **every** POST/PATCH/PUT/DELETE, require header `x-csrf-token` equal to cookie value.
- Reject if missing/mismatch; exempt pure JSON API when using Authorization header tokens.

---

## 7) Rate Limiting
- Sliding window in Redis; keys: `rl:ip:{ip}:login`, `rl:acct:{email}:login`.
- Defaults: `login`: 10/min IP, 5/5min per account; `register`: 5/min IP; `verify-send`: 3/5min per account.
- On violation: 429 with `Retry-After`.

---

## 8) Endpoints
```
POST /auth/register        public   RL(ip:5/min)
POST /auth/login           public   RL(ip:10/min, acct:5/5min)
POST /auth/logout          auth     CSRF
GET  /auth/me              auth
POST /auth/request-verify  auth     RL(acct:3/5min)
POST /auth/verify          public   RL(acct:10/5min)
POST /auth/request-reset   public   RL(acct:3/5min)
POST /auth/reset-password  public   RL(acct:3/5min)
GET  /sessions             auth     list active sessions
POST /sessions/:id/revoke  auth     revoke one session (CSRF)
```

---

## 9) Flows (algorithmic checklists)
### Register
1. Normalize email → lowercase, trim.
2. Validate password policy.
3. HIBP check; reject if pwned.
4. Create `User`, `PasswordCredential`.
5. Create session; set cookie.
6. Queue verify email.
7. Audit: REGISTER, VERIFY_SENT.

### Login
1. Rate limit by IP and by account.
2. Find user by email; if missing, set `user=null`.
3. Compute `ok = verify(user?.hash || DUMMY_HASH, password+pepper)`.
4. If user null or !ok or !isActive → `Audit LOGIN_FAIL`; return 401 generic.
5. Create session; set cookie; `Audit LOGIN_SUCCESS`.

### Verify Email
1. Accept `token`.
2. Hash token; lookup valid token.
3. Mark used; set `emailVerifiedAt=now()`; invalidate other verification tokens.

### Request/Reset Password
- Request: generate 32B token, store **hash** with 30‑min TTL, send email.
- Reset: verify token hash, set new password hash, **invalidate all sessions for user**, mark token used.

---

## 10) Guards & Middleware
- **SessionGuard**: reads cookie, loads Redis session, checks revocation/expiry, attaches `req.user`.
- **RolesGuard**: checks `userId → roles` in DB.
- **CsrfMiddleware**: verify on mutating routes.
- **RateLimitGuard**: wrap endpoints with keys and limits.

---

## 11) Minimal Mail Templates
- Verify: subject `Confirm your email`, body with `${FRONTEND_URL}/verify?token=...`.
- Reset: subject `Reset your password`, body with `${FRONTEND_URL}/reset?token=...`.
- Tokens are 32B base64url; only **hash** stored in DB.

---

## 12) Demo User Mode (optional)
Rules to apply in guard when `user.isDemo === true`:
- Read‑only everywhere except favorites.
- Restrict dataset list to `DEMO_WALLETS` env var.

---

## 13) Authorization (RBAC)
- Roles: `user`, `admin`.
- `@RequireRole('admin')` decorator + guard.
- All authorization server‑side; client role claims ignored.

---

## 14) LLM Build Prompts (module‑by‑module)
Status: A–F implemented in `auth_module/package/src/lib/`

### Prompt A — AuthModule
```
Implement NestJS AuthModule with controller and service for routes listed in Section 8. Use Prisma models from Section 2. Passwords: Argon2id + global pepper from env. Sessions: call SessionService.create(userId, req). Email: call MailerService with Verify/Reset templates. Emit AuditLog events. Ensure no user enumeration: identical 401 on bad login. Include DTOs with class‑validator.
```

### Prompt B — SessionModule
```
Implement SessionService using Redis (ioredis). API: create(userId, req) -> sessionId; get(sessionId) -> {userId,...}; revoke(sessionId); revokeAll(userId); list(userId). Cookie issuance: set HttpOnly, Secure, SameSite=Strict, Max‑Age from env. Hash IP (sha256(ip + PEPPER)).
```

### Prompt C — Csrf & RateLimit
```
Implement CsrfMiddleware with double‑submit cookie named from env. For POST/PATCH/PUT/DELETE require header x-csrf-token === cookie value. Implement RateLimitGuard with sliding window in Redis, configurable limits per route.
```

### Prompt D — RBAC
```
Implement RolesGuard and @RequireRole decorator. Load roles from Prisma via UserRole. Deny with 403. Add example protected admin route.
```

### Prompt E — Mailer
```
Implement MailerService using nodemailer with SMTP env. Functions: sendVerifyEmail(user, token), sendPasswordReset(user, token). Build links using FRONTEND_URL env.
```

### Prompt F — Audit
```
Implement AuditService.append(kind: string, userId?: string, req?: Request, meta?: any). Store ip and ua. Use in all auth flows.
```

---

## 15) Acceptance Tests (must pass)
- Register → session cookie set; verify email queued; audit entries present.
- Login bad email/password → 401; no enumeration; rate limits enforced.
- CSRF required on mutating routes when cookie present.
- Request reset → token created; Reset with token → password changed; **all sessions revoked**.
- /auth/me returns user when cookie valid; 401 when session revoked/expired.
- Role guard denies non‑admin; allows admin.

---

## 16) Threat Controls
- Dummy hash on login for timing equalization.
- Normalize emails; store lowercase.
- Generic errors for auth failures.
- Secure cookie flags; HTTPS enforced at proxy.
- Lenient clock skew not required for opaque sessions.

---

## 17) Build Order
1) Prisma models + migrations.
2) SessionModule (Redis + cookie).
3) AuthModule (register/login/logout/me).
4) Mailer + verify + reset flows.
5) CSRF + RateLimit.
6) RBAC + admin route.
7) Audit logging.
8) Demo mode rules.

---

## 18) Ops Notes
- Secrets in a manager (Doppler/Vault). Rotate `AUTH_PEPPER` only after forcing password reset.
- Back up Postgres; Redis is ephemeral.
- Set `COOKIE_DOMAIN` correctly across subdomains; consider `SameSite=Lax` if your frontend needs cross‑site flows.

---

## 19) Extension Points (when needed)
- Swap sessions for JWT+refresh later; keep `AuthPort` stable.
- Add MFA (TOTP/WebAuthn) as a separate Step‑Up guard.
- Add API keys with hashed storage and prefixes.

---

This template is intentionally minimal, production‑safe, and expandable without vendor lock‑in.
