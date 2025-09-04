Status (V1)

Implemented
- Session: Redis-backed opaque sessions, cookie issuance, guard, listing/revocation endpoints
- Auth: Register, Login, Logout, Me, Request/Verify Email, Request/Reset Password
- CSRF: Double-submit cookie middleware; applies to mutating requests when session cookie present
- Rate Limiting: Sliding window in Redis; decorators and guard; Retry-After handling
- RBAC: Roles guard and decorator using Prisma UserRole->Role
- Mailer: SMTP via nodemailer; verify/reset templates
- Audit: Append-only events via Prisma
- Packaging: npm skeleton with exports, peer deps, and docs

Pending / Deferred
- Demo user mode guard rules
- Full unit and e2e tests (consumer or package-level)
- Example consumer Nest app and minimal Next.js frontend
- Stronger type bindings to Prisma models (replace `any` with interfaces)
- HIBP password breach check (documented but not implemented here)

