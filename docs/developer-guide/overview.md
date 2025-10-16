Overview

Goal: Provide a lean, secure-by-default auth baseline with minimal moving parts, centered on server-side opaque sessions, Argon2id passwords with a global pepper, CSRF protection for cookie flows, basic RBAC, and audit logs. Targets OWASP ASVS L1+ for production readiness.

Core Modules
- Auth: Register, Login, Logout, Me, Email Verify, Password Reset
- Session: Opaque session IDs stored in Redis; secure cookie issuance
- CSRF: Double-submit cookie for state-changing requests over cookie sessions
- Rate Limiting: Sliding window limits in Redis by IP and account
- RBAC: Roles, guards, and decorator for protected routes
- Mailer: Verify and reset transactional emails
- Audit: Append-only events across auth flows

Data Model
- User, PasswordCredential, Session, EmailVerificationToken, PasswordResetToken, Role, UserRole, AuditLog

Session Model
- Opaque session ID (random 32B base64url), HttpOnly+Secure+SameSite cookie
- Redis holds session state with TTL; revoke by ID or all by user

Out of Scope (for v1)
- MFA, social login, OAuth provider/consumer, orgs/teams, hardware tokens

