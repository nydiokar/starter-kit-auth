Status (V1)

✅ **Fully Implemented & Working**
- Session: Redis-backed opaque sessions, cookie issuance, guard, listing/revocation endpoints
- Auth: Register, Login, Logout, Me, Request/Verify Email, Request/Reset Password
- CSRF: Double-submit cookie middleware; applies to mutating requests when session cookie present
- Rate Limiting: Sliding window in Redis; decorators and guard; Retry-After handling
- RBAC: Roles guard and decorator using Prisma UserRole->Role (includes Reflector dependency)
- Mailer: SMTP via nodemailer; verify/reset templates
- Audit: Append-only events via Prisma
- Packaging: npm package with ESM support, proper exports, peer deps, and working DI
- **Consumer Integration**: Successfully tested with auth-consumer app - all DI working correctly

✅ **Package Quality**
- ESM-compatible with `.js` extensions in imports
- Proper NestJS dependency injection (Redis, Prisma, Reflector, etc.)
- All guards and services export correctly for consumer apps
- Build pipeline working with TypeScript compilation

Pending / Deferred
- Demo user mode guard rules
- Full unit and e2e tests (consumer or package-level) 
- Example consumer Nest app documentation (working app exists)
- Minimal Next.js frontend example
- Stronger type bindings to Prisma models (replace `any` with interfaces)
- HIBP password breach check (documented but not implemented here)
- Optional SES IAM setup docs if using AWS SES provider
