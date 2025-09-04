Setup

Prerequisites
- Postgres for user and auth tables
- Redis for session store and rate limiting
- SMTP credentials for outbound email (verification, reset)

Environment
- Copy `config/.env.example` to your service environment and fill values.
- Ensure `AUTH_PEPPER` is a long, random secret; rotate only with a coordinated password reset.

Build Order (recommended)
1) Define Prisma (or ORM) models and run migrations
2) Implement Session module (Redis + cookie issuance)
3) Implement Auth module (register/login/logout/me)
4) Implement Mailer + verify and reset flows
5) Add CSRF middleware and RateLimit guard
6) Add RBAC guard and an example admin route
7) Add Audit logging for key events

Security Defaults
- Enforce HTTPS at proxy; set Secure cookies in all environments except local dev
- Normalize and lowercase emails; generic error messages on failures
- Implement dummy hash check to prevent user enumeration by timing

Testing
- Use examples/http/requests.http or examples/curl/* to verify each flow incrementally.

