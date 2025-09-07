Here's a focused, hand-off-ready plan for building tests in the original auth_module so you can trust it as a standalone
backend and keep the consumer app as an integration harness.

## ✅ IMPLEMENTATION STATUS

**COMPLETED:** A comprehensive test suite has been implemented following this specification. The auth_module now includes:

- **Unit Tests**: 100+ test cases covering AuthService, SessionService, RateLimitGuard, and cookies utility
- **Integration Tests**: End-to-end flows testing real Nest module with SQLite DB and Redis
- **Security Tests**: CSRF protection, rate limiting, email enumeration prevention, and timing attack mitigation
- **Packaging Tests**: npm pack verification with DI sanity checks
- **Test Infrastructure**: Robust mocking system, test utilities, and CI-ready configuration

All tests are designed to run independently with proper isolation, cleanup, and realistic scenarios.

Scope

- Target: auth_module (the Nest module/package).
- Goal: Unit + integration + packaging tests proving core flows, security controls, and DI.
- Out of scope: UI; consumer app already has smoke/e2e.

Test Stack

- Runner: Jest + @nestjs/testing.
- HTTP: Supertest for e2e where needed.
- DB: Prisma + SQLite file (tmp dir) for integration; in-memory fakes for unit.
- Redis: Real Redis in CI (service container) for integration; ioredis-mock for unit.
- Mailer: Dev stub that captures tokens in-memory.

Project Setup

- Add Jest config and setup:
    - jest.config.js: ts-jest or Babel; collectCoverage; setupFilesAfterEnv.
    - jest.setup.ts: fake timers enabled (modern), clear env, seed RNG.
- Add npm scripts in auth_module/package.json:
    - test, test:unit, test:int, test:pack, test:ci (runs all).
- Ensure Prisma client for tests:
    - tests/prisma/schema.prisma with the same models the module expects (User, PasswordCredential, Session,
EmailVerificationToken, PasswordResetToken, Role, UserRole, AuditLog).
    - tests/prisma/seed.ts to create baseline roles.
    - Use SQLite file in a temp directory per test run.

Unit Tests (fast, isolated)

- Folder: tests/unit/
- Common mocks:
    - mocks/prisma.fake.ts: Minimal in-memory fake implementing used methods (user, passwordCredential, session, tokens,
role, userRole, auditLog).
    - mocks/redis.mock.ts: ioredis-mock instance.
    - mocks/mailer.capture.ts: { sendVerifyEmail, sendPasswordReset } push tokens to an array.
    - mocks/redis.mock.ts: ioredis-mock instance.
    - mocks/mailer.capture.ts: { sendVerifyEmail, sendPasswordReset } push tokens to an array.
-
Files and coverage:
    - auth.service.spec.ts
    - register: creates user + cred, sets audit “REGISTER”, enqueues verify token, returns 201.
    - register duplicate: returns generic 400, no user created.
    - login success: sets cookie (assert via return of cookie builder), audit “LOGIN_SUCCESS”.
    - login fail: returns 401, audit “LOGIN_FAIL”.
    - logout: revokes session (calls sessionService.revoke), 204.
    - request-verify (with session): creates token, calls mailer, 204.
    - verify: valid token → marks verified (or deletes/uses token), rejects reused/expired tokens.
    - request-reset: creates reset token, calls mailer, 204.
    - reset-password: valid token → updates hash, token invalid afterward, 204.
- session.service.spec.ts
    - create: writes to Redis + Prisma, TTL ~ cookie.ttlDays.
    - get: returns JSON record.
    - revoke: deletes Redis + Prisma row.
    - revokeAll: removes all user sessions (Prisma + Redis scan fallback).
- ratelimit.guard.spec.ts
    - Multiple requests surpass limit → 429 + Retry-After present.
    - Separate by email vs IP behave per rule.
- cookies.spec.ts (if cookie builder is exported)
    - Asserts `SameSite`, `Secure`, `Max-Age`, `Domain`, name/value.

- Security-focused unit checks:
    - Pepper used in argon2 hash/verify calls (spy).
    - Email enumeration: request-reset returns identical status/message for existing vs non-existing.
    - Timing deltas: success vs failure are within reasonable bound (coarse check using fake timers or averaged
samples).

Integration/E2E Tests (real Nest module)

- Folder: tests/integration/
- Test harness module:
    - Build Nest TestingModule with:
    - `AuthModule.forRoot({ redis, prisma, cookie, csrfCookieName, pepper, mailer: {}, mailerProvider: { useValue:
captureMailer } })`
    - Add `CsrfModule` if CSRF middleware is enforced there.
    - Provide `AUTH_PRISMA` as Prisma client pointing to test SQLite DB.
    - Provide `AUTH_REDIS` as real Redis (CI service).
- Expose real controllers (AuthController, SessionsController); add a tiny AdminController in test module with
@RequireRole('admin') endpoint for RBAC.
Expose real controllers (AuthController, SessionsController); add a tiny AdminController in test module with
@RequireRole('admin') endpoint for RBAC.
-
Files and flows:
    - auth.flows.e2e-spec.ts (Supertest)
    - Register → Set-Cookie present; Me → 200.
    - Request-verify requires session; fetch token from capture; Verify → ok; Verify again → fail.
    - Logout → 204; Me → 401; Login → 200; Me → 200.
    - Request-reset (with/without session) → 204; Reset with token → 204; Login with new password → 200.
- csrf.e2e-spec.ts
    - With session cookie:
      - POST without `x-csrf-token` → 403.
      - POST with wrong token → 403.
      - POST with correct token → 2xx.
- sessions.e2e-spec.ts
    - List sessions → shows current; Revoke via controller → session invalid; Cookie no longer works.
- rbac.e2e-spec.ts
    - Admin route → 403 for normal user; Assign admin role in DB; Admin route → 200.
- ratelimit.e2e-spec.ts
    - Rapid wrong-password attempts → observe 429 + Retry-After >= 1; Upon clearing RL keys, next attempt allowed.
- audit.e2e-spec.ts
    - After flows, audit log contains expected events in order (REGISTER, VERIFY_SENT, LOGIN_SUCCESS/FAIL, RESET_SENT,
etc.).
- cookies.e2e-spec.ts
    - `Set-Cookie` flags follow config (e.g., `SameSite=Strict` in test config; flip to None+Secure and assert).

- Integration infra utilities:
    - utils/test-app.ts: helper to spin app with config and replace mailer; returns app, request, captureTokens, prisma,
redis.
    - utils/db.ts: SQLite file path per test worker, migrations (prisma migrate deploy or db push) on beforeAll, cleanup
afterAll.
    - utils/redis.ts: real Redis client, flushall() beforeEach.

Packaging Test

- Folder: tests/pack/
- Steps:
    - Run npm pack to produce .tgz.
    - In a temp dir, npm init -y && npm i ../<tgz> ioredis prisma @nestjs/common @nestjs/core reflect-metadata.
    - Script loads the package dist/index.js and runs a DI sanity similar to test-di.ts:
    - Create TestingModule with `AuthModule.forRoot(mockConfig)`.
    - Assert `AUTH_CONFIG` values, `AUTH_REDIS` is instance of `ioredis`, and `AuthService`/`SessionService` resolve.
- Fail if any import/DI breaks.

CI Pipeline (2-stage)

- Stage 1: Module
    - npm ci
    - npm run build
    - Start Redis service (container).
    - Unit tests: npm run test:unit (use ioredis-mock).
    - Integration tests: bring up SQLite DB, seed roles, npm run test:int (uses real Redis).
    - Packaging test: npm run test:pack
- Stage 2: Consumer (integration harness)
    - Build module npm pack and install tarball into apps/auth-consumer.
    - Start Redis service for consumer.
    - Run consumer migrations/seed.
    - Start consumer app (background) with NODE_ENV=development.
    - npm run smoke in apps/auth-consumer.

Deliverables Checklist

- Config
    - jest.config.js, jest.setup.ts
    - tests/prisma/schema.prisma, tests/prisma/seed.ts
- Unit
    - tests/unit/auth.service.spec.ts
    - tests/unit/session.service.spec.ts
    - tests/unit/ratelimit.guard.spec.ts
    - tests/unit/cookies.spec.ts
- Integration
    - tests/integration/auth.flows.e2e-spec.ts
    - tests/integration/csrf.e2e-spec.ts
    - tests/integration/sessions.e2e-spec.ts
    - tests/integration/rbac.e2e-spec.ts
    - tests/integration/audit.e2e-spec.ts
    - tests/integration/cookies.e2e-spec.ts
    - tests/integration/utils/{test-app.ts,db.ts,redis.ts}
- Packaging
    - tests/pack/pack.spec.ts
- Scripts
    - test, test:unit, test:int, test:pack, test:ci

Acceptance Criteria

- All unit and integration tests pass locally and in CI with fresh SQLite file and Redis.
- Packaging test passes (npm pack artifact can be imported and used in a fresh Nest TestingModule).
- Consumer smoke (apps/auth-consumer) passes using the built tarball.
- Evidence of security properties:
    - CSRF enforced on POSTs when session cookie present.
    - Tokens are one-time and expire.
    - Rate limiting returns 429 with Retry-After.
    - No email enumeration via response shape/status; timing deltas below threshold.
    - Session lifecycle works (create, revoke, TTL respected).
    - RBAC enforced.
