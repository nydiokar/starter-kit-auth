Testing

Acceptance Checklist
- Register creates user, sets session cookie, queues verification email, writes audit logs.
- Login with bad email or password returns 401 with generic message; rate limits enforced.
- CSRF required on mutating routes when cookie is present.
- Request reset creates a token; Reset with token changes password and revokes all sessions.
- /auth/me returns user when session valid; 401 when revoked/expired.
- RBAC guard blocks non-admin from admin routes; allows admin.

How to Test
- Use examples/http/requests.http with a REST client that supports cookies.
- Use examples/curl scripts for quick CLI checks (ensure cookie jar usage for session tests).

Tips
- Seed at least one admin role for RBAC tests.
- Include tests for session revocation and cookie flags via response headers.

Current Coverage
- Manual flows supported via examples/http and curl scripts.
- Package does not include a test runner; choose either:
  - Consumer e2e tests (recommended): set up Nest e2e tests in your app using Supertest.
  - Package unit tests: add Jest/Vitest config under `auth_module/package/` and mock Prisma/Redis.
