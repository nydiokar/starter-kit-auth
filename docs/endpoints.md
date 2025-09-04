Endpoints

Auth
- POST /auth/register: Public. Rate limit: IP 5/min.
- POST /auth/login: Public. Rate limit: IP 10/min, Account 5/5min.
- POST /auth/logout: Authenticated. Requires CSRF token.
- GET  /auth/me: Authenticated. Returns current user.

Email Verification
- POST /auth/request-verify: Authenticated. RL: account 3/5min. Sends email with token.
- POST /auth/verify: Public. RL: account 10/5min. Confirms email by token.

Password Reset
- POST /auth/request-reset: Public. RL: account 3/5min. Sends reset token.
- POST /auth/reset-password: Public. RL: account 3/5min. Resets password; revokes all sessions.

Sessions
- GET /sessions: Authenticated. Lists active sessions for the user.
- POST /sessions/:id/revoke: Authenticated. Requires CSRF. Revokes a specific session.

Request/Response Notes
- All error responses are generic; avoid user enumeration.
- For cookie flows, include header `x-csrf-token` on mutating requests.
- Session cookie flags: HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=TTL.

