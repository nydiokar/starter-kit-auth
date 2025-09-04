Security

Passwords
- Argon2id with per-user salt and a global pepper from env.
- Perform a dummy hash verify when a user is not found to equalize timing.

CSRF
- Double-submit cookie: set `CSRF_COOKIE_NAME` cookie; require header `x-csrf-token` matching cookie for all POST/PATCH/PUT/DELETE when using cookie sessions.

Sessions
- Opaque sessions stored in Redis with TTL and revocation.
- Cookie flags: HttpOnly, Secure, SameSite=Strict (consider Lax if cross-site flows are needed), Path=/.

Rate Limiting
- Sliding window limits in Redis keyed by IP and account.
- Return 429 with Retry-After on violations.

Audit
- Append-only log for critical auth events: REGISTER, LOGIN_SUCCESS/FAIL, LOGOUT, VERIFY_SENT/OK, RESET_REQ/OK.

Threat Controls
- Normalized lowercase emails; generic error messages.
- HTTPS enforced at the proxy; secrets managed via a secret manager.

