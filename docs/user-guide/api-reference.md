# 📚 API Reference

Complete reference for all authentication and authorization endpoints provided by the Lean Auth Module.

## Base URL

All endpoints are prefixed with `/auth` unless otherwise noted.

```
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /auth/request-verify
POST /auth/verify
POST /auth/request-reset
POST /auth/reset-password
GET  /sessions
POST /sessions/:id/revoke
```

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Creates a new user account and optionally sends email verification.

#### Request Body
```typescript
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### Response (201 Created)
```typescript
{
  "id": "clj8q2x8r0000v8w8k8p8k8p8",
  "email": "user@example.com",
  "requiresVerification": false,
  "verificationSent": true
}
```

#### Response (202 Accepted - Verification Required)
```typescript
{
  "id": "clj8q2x8r0000v8w8k8p8k8p8",
  "email": "user@example.com",
  "requiresVerification": true,
  "verificationSent": true
}
```

#### Rate Limiting
- **IP-based**: 5 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

#### Example
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123"}'
```

---

### Login User

**POST** `/auth/login`

Authenticates a user and creates a session.

#### Request Body
```typescript
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### Response (200 OK)
```typescript
{
  "id": "clj8q2x8r0000v8w8k8p8k8p8",
  "email": "user@example.com",
  "emailVerified": true
}
```

#### Response (401 Unauthorized)
```typescript
{
  "error": "Invalid credentials"
}
```

#### Response (403 Forbidden - Email Verification Required)
```typescript
{
  "error": "Email verification required"
}
```

#### Rate Limiting
- **IP-based**: 10 requests per minute
- **Account-based**: 5 requests per 5 minutes
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

#### Example
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123"}'
```

---

### Logout User

**POST** `/auth/logout`

Destroys the current user session.

#### Headers Required
```
Authorization: Bearer <token>  # If using token auth
x-csrf-token: <token>         # If using cookie auth
```

#### Response (204 No Content)
No response body

#### Example
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "x-csrf-token: your-csrf-token"
```

---

### Get Current User

**GET** `/auth/me`

Retrieves information about the currently authenticated user.

#### Authentication Required
Session cookie or bearer token

#### Response (200 OK)
```typescript
{
  "id": "clj8q2x8r0000v8w8k8p8k8p8",
  "email": "user@example.com"
}
```

#### Response (401 Unauthorized)
```typescript
{
  "error": "Unauthorized"
}
```

#### Example
```bash
curl -H "Cookie: session-id=your-session-cookie" \
  http://localhost:3000/auth/me
```

## Email Verification Endpoints

### Request Email Verification

**POST** `/auth/request-verify`

Sends a new email verification token to the authenticated user.

#### Authentication Required
Session cookie or bearer token

#### Response (204 No Content)
No response body

#### Rate Limiting
- **Account-based**: 3 requests per 5 minutes

#### Example
```bash
curl -X POST http://localhost:3000/auth/request-verify \
  -H "Cookie: session-id=your-session-cookie"
```

---

### Verify Email

**POST** `/auth/verify`

Verifies a user's email address using a verification token.

#### Request Body
```typescript
{
  "token": "your-verification-token-from-email"
}
```

#### Response (204 No Content)
No response body

#### Rate Limiting
- **Account-based**: 10 requests per 5 minutes

#### Example
```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "your-verification-token"}'
```

## Password Reset Endpoints

### Request Password Reset

**POST** `/auth/request-reset`

Sends a password reset email to the specified user.

#### Request Body
```typescript
{
  "email": "user@example.com"
}
```

#### Response (204 No Content)
No response body (always returns 204 to prevent user enumeration)

#### Rate Limiting
- **Account-based**: 3 requests per 5 minutes

#### Example
```bash
curl -X POST http://localhost:3000/auth/request-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

### Reset Password

**POST** `/auth/reset-password`

Resets a user's password using a reset token.

#### Request Body
```typescript
{
  "token": "your-reset-token-from-email",
  "password": "newsecurepassword123"
}
```

#### Response (204 No Content)
No response body

#### Rate Limiting
- **Account-based**: 3 requests per 5 minutes

#### Example
```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-reset-token",
    "password": "newsecurepassword123"
  }'
```

## Session Management Endpoints

### List User Sessions

**GET** `/sessions`

Retrieves all active sessions for the authenticated user.

#### Authentication Required
Session cookie or bearer token

#### Response (200 OK)
```typescript
[
  {
    "id": "session-id-1",
    "createdAt": "2024-01-01T10:00:00Z",
    "userAgent": "Mozilla/5.0...",
    "ipHash": "hashed-ip-address"
  },
  {
    "id": "session-id-2",
    "createdAt": "2024-01-01T11:00:00Z",
    "userAgent": "curl/7.68.0",
    "ipHash": "different-hashed-ip"
  }
]
```

#### Example
```bash
curl -H "Cookie: session-id=your-session-cookie" \
  http://localhost:3000/sessions
```

---

### Revoke Session

**POST** `/sessions/:id/revoke`

Revokes a specific session by ID.

#### Authentication Required
Session cookie or bearer token

#### Headers Required
```
x-csrf-token: <token>  # Required for CSRF protection
```

#### Path Parameters
- `id`: Session ID to revoke

#### Response (204 No Content)
No response body

#### Example
```bash
curl -X POST http://localhost:3000/sessions/session-id-123/revoke \
  -H "Cookie: session-id=your-session-cookie" \
  -H "x-csrf-token: your-csrf-token"
```

## Request Headers

### Authentication Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Cookie` | Session cookie | `session-id=abc123` |
| `Authorization` | Bearer token | `Bearer jwt-token` |
| `x-csrf-token` | CSRF token | `csrf-token-value` |

### Rate Limiting Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed | `10` |
| `X-RateLimit-Remaining` | Remaining requests | `7` |
| `X-RateLimit-Reset` | Unix timestamp when limit resets | `1704067200` |
| `Retry-After` | Seconds to wait before retrying | `60` |

## Response Status Codes

| Code | Description | When Used |
|------|-------------|-----------|
| `200` | Success | Successful operations |
| `201` | Created | User registration, session creation |
| `202` | Accepted | Registration with verification pending |
| `204` | No Content | Successful operations with no response body |
| `400` | Bad Request | Invalid request data |
| `401` | Unauthorized | Authentication required or failed |
| `403` | Forbidden | CSRF token missing/invalid, insufficient permissions |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side errors |

## Data Types

### User Object
```typescript
{
  "id": "string",           // Unique user identifier
  "email": "string",        // User's email address
  "emailVerified": "boolean?" // Email verification status
}
```

### Session Object
```typescript
{
  "id": "string",           // Unique session identifier
  "createdAt": "string",    // ISO timestamp when session was created
  "userAgent": "string",    // User agent string from request
  "ipHash": "string"        // Hashed IP address for privacy
}
```

### Error Response
```typescript
{
  "error": "string"         // Human-readable error message
}
```

## Validation Rules

### Email Validation
- Must be a valid email format
- Normalized to lowercase before storage
- Maximum length: 255 characters

### Password Validation
- Minimum length: 8 characters
- Maximum length: 128 characters
- Must contain at least one letter and one number
- Case-sensitive

### Token Validation
- Verification tokens: 32 bytes, base64url encoded
- Reset tokens: 32 bytes, base64url encoded
- Tokens expire after 1 hour (verification) or 30 minutes (reset)

## Security Headers

The API sets the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filtering |
| `Strict-Transport-Security` | `max-age=31536000` | Enforce HTTPS |

## Rate Limiting Details

### IP-Based Limiting
- Applied to all public endpoints
- Uses client's IP address
- Sliding window algorithm

### Account-Based Limiting
- Applied to authenticated endpoints
- Uses user's email address
- Prevents abuse across multiple sessions

### Rate Limit Headers
All responses include rate limiting information:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1704067200
```

When rate limited:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

## Error Handling

### Consistent Error Responses
All endpoints return consistent error formats:

```typescript
{
  "error": "Human-readable error message"
}
```

### Error Types

| Error | Status Code | Description |
|-------|-------------|-------------|
| `Invalid credentials` | 401 | Authentication failed |
| `Email verification required` | 401 | Login blocked due to unverified email |
| `Unauthorized` | 401 | Missing or invalid authentication |
| `Invalid CSRF token` | 403 | CSRF protection violation |
| `Too Many Requests` | 429 | Rate limit exceeded |

## Integration Examples

### Frontend Integration (React/TypeScript)

```typescript
// Auth service
class AuthService {
  private baseURL = 'http://localhost:3000';

  async register(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.status === 202) {
      // Email verification required
      return { requiresVerification: true };
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.status === 401) {
      const error = await response.json();
      if (error.error === 'Email verification required') {
        // Redirect to verification page
        return { verificationRequired: true };
      }
      throw new Error('Invalid credentials');
    }

    return response.json();
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      credentials: 'include' // Include cookies
    });

    if (!response.ok) {
      throw new Error('Not authenticated');
    }

    return response.json();
  }
}
```

### Backend Integration (Node.js/Express)

```typescript
// Middleware for protected routes
const requireAuth = async (req, res, next) => {
  try {
    const response = await fetch('http://localhost:3000/auth/me', {
      headers: {
        'Cookie': req.headers.cookie,
        'Authorization': req.headers.authorization
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await response.json();
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication service unavailable' });
  }
};

// Usage in routes
app.get('/protected', requireAuth, (req, res) => {
  res.json({ message: `Hello ${req.user.email}` });
});
```

## Best Practices

### Frontend Integration
1. **Store tokens securely** - Use httpOnly cookies when possible
2. **Handle CSRF tokens** - Include in state-changing requests
3. **Check verification status** - Handle 202 responses from registration
4. **Graceful error handling** - Provide user-friendly error messages

### Backend Integration
1. **Proxy authentication** - Route auth requests through your backend
2. **Validate responses** - Check response structure and status codes
3. **Handle rate limits** - Implement exponential backoff for retries
4. **Monitor failures** - Log authentication failures for security monitoring

### Security Considerations
1. **Always use HTTPS** in production
2. **Validate all inputs** on both frontend and backend
3. **Implement proper CSRF protection** for cookie-based auth
4. **Monitor rate limiting** for abuse detection
5. **Log security events** for audit trails

## Troubleshooting

### Common Issues

#### "Invalid credentials" on login
- Check if email is verified (if verification is required)
- Verify password is correct
- Check if user account is active

#### "CSRF token mismatch"
- Ensure CSRF token is included in requests
- Check cookie domain configuration
- Verify token hasn't expired

#### Rate limiting errors
- Check rate limit headers for reset time
- Implement proper backoff strategy
- Monitor for legitimate vs malicious traffic

#### Email verification not working
- Check SMTP configuration
- Verify email templates and links
- Check token expiration (1 hour for verification tokens)

## Next Steps

1. ✅ **Review API Reference** - Understand all available endpoints
2. 🔒 **Review Security** - See [Security Guide](./security.md)
3. 🚀 **Deploy to Production** - See [Deployment Guide](./deployment.md)
4. 🛠️ **Troubleshoot Issues** - See [Troubleshooting Guide](./troubleshooting.md)

## Support

For API-related questions or issues, refer to the [Troubleshooting Guide](./troubleshooting.md) or check the [GitHub Issues](https://github.com/your-repo/issues) for known problems and solutions.
