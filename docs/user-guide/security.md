# 🔒 Security Guide

Comprehensive security features and best practices for using the Lean Auth Module securely in production environments.

## Security Features

### Password Security

#### Argon2id Password Hashing
- **Algorithm**: Argon2id (winner of Password Hashing Competition)
- **Parameters**: Memory: 19456 KiB, Time: 2 iterations, Parallelism: 1
- **Global Pepper**: Cryptographically secure secret added to all passwords
- **Salt**: Unique per-user random salt

```typescript
// Password hashing process
const hash = await argon2.hash(password + PEPPER, {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
});
```

#### Timing Attack Protection
- **Dummy Hash Verification**: Always performs password verification even for non-existent users
- **Constant Time Operations**: All authentication operations take consistent time
- **No Information Leakage**: Identical responses for valid vs invalid credentials

### Session Security

#### HTTP-Only Cookies
```typescript
{
  httpOnly: true,      // Prevents XSS access
  secure: true,        // HTTPS only in production
  sameSite: 'strict',  // Prevents CSRF
  path: '/',
  maxAge: ttlSeconds
}
```

#### Session Storage
- **Redis Backend**: Server-side session storage
- **Opaque Tokens**: Random 32-byte session IDs
- **Automatic Expiration**: Configurable TTL with cleanup
- **IP Hashing**: Client IP stored as hash for privacy

### CSRF Protection

#### Double-Submit Cookie Pattern
- **CSRF Token Cookie**: HTTP-only cookie set on first GET request
- **Header Verification**: `x-csrf-token` header required for state-changing requests
- **Session Validation**: CSRF protection only active when session cookie present

```typescript
// CSRF token generation (secure crypto)
const token = randomTokenB64url(32);

// Cookie settings
serialize('csrf-token', token, {
  httpOnly: false,     // Accessible to JavaScript
  secure: true,
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 30 // 30 days
});
```

### Rate Limiting

#### Sliding Window Algorithm
- **Redis-Backed**: Distributed rate limiting across instances
- **IP-Based**: Per-IP address limits for public endpoints
- **Account-Based**: Per-user limits for authenticated endpoints

#### Default Limits
| Endpoint | IP Limit | Account Limit | Window |
|----------|----------|---------------|---------|
| `/auth/register` | 5/min | - | 60s |
| `/auth/login` | 10/min | 5/5min | 60s |
| `/auth/request-verify` | - | 3/5min | 300s |
| `/auth/verify` | - | 10/5min | 300s |
| `/auth/request-reset` | - | 3/5min | 300s |
| `/auth/reset-password` | - | 3/5min | 300s |

### Email Verification

#### Secure Token Generation
- **32-byte Tokens**: Cryptographically secure random tokens
- **SHA-256 Hashing**: Only token hashes stored in database
- **Expiration**: 1-hour expiration for verification tokens
- **Single Use**: Tokens invalidated after successful use

#### Anti-Enumeration Protection
- **Consistent Responses**: Identical responses regardless of user existence
- **No Rate Limiting Disclosure**: Rate limit headers don't reveal user status

### Input Validation & Sanitization

#### Email Normalization
```typescript
// Always normalized before storage
const normalized = email.trim().toLowerCase();
```

#### Password Requirements
- **Minimum Length**: 8 characters
- **Maximum Length**: 128 characters
- **Complexity**: Must contain letters and numbers
- **Case-sensitive**

### Audit Logging

#### Comprehensive Event Tracking
```typescript
// All authentication events logged
- REGISTER: New user registration
- LOGIN_SUCCESS: Successful authentication
- LOGIN_FAIL: Failed authentication attempts
- LOGIN_FAIL_NOT_VERIFIED: Login blocked by unverified email
- LOGOUT: User logout
- VERIFY_SENT: Email verification sent
- VERIFY_OK: Email verification successful
- VERIFY_SEND_FAILED: Email sending failed
- RESET_REQ: Password reset requested
- RESET_OK: Password reset completed
- RESET_SEND_FAILED: Password reset email failed
- SESSION_CREATED_POST_VERIFICATION: Session created after email verification
```

#### Privacy Protection
- **IP Hashing**: IP addresses stored as SHA-256 hashes
- **No Personal Data**: Audit logs contain only necessary security information
- **Immutable Records**: Append-only audit trail

## Security Best Practices

### Production Deployment

#### HTTPS Enforcement
```typescript
// app.module.ts or main.ts
app.enableCors({
  origin: 'https://yourdomain.com',
  credentials: true
});

// Force HTTPS in production
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

#### Secure Headers
```typescript
// helmet configuration for NestJS
import * as helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Secret Management

#### Password Pepper
```bash
# Generate securely
openssl rand -hex 32

# Store in environment variable
AUTH_PEPPER=your-256-bit-secret-here

# Or use secret management
kubectl create secret generic auth-secrets \
  --from-literal=pepper="$(openssl rand -hex 32)"
```

#### Database Credentials
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

## Threat Mitigation

### Common Attack Vectors

#### Brute Force Attacks
**Mitigation:**
- Account-based rate limiting (5 attempts per 5 minutes)
- Progressive delays after failed attempts
- CAPTCHA integration points available

#### Credential Stuffing
**Mitigation:**
- Unique password requirements
- Global pepper prevents rainbow table attacks
- Timing attack protection

#### Session Hijacking
**Mitigation:**
- HTTP-only cookies prevent XSS theft
- Secure flag prevents interception
- SameSite protection prevents CSRF
- Automatic expiration and IP tracking

#### User Enumeration
**Mitigation:**
- Identical error responses for all authentication failures
- No rate limiting differences based on user existence
- Consistent response times

## Security Testing

### Automated Security Tests
```typescript
// security-tests.spec.ts
describe('Security Tests', () => {
  it('should prevent timing attacks', async () => {
    const start1 = Date.now();
    await request(app).post('/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await request(app).post('/auth/login').send({
      email: 'existing@example.com',
      password: 'wrongpassword'
    });
    const time2 = Date.now() - start2;

    // Times should be within 100ms of each other
    expect(Math.abs(time1 - time2)).toBeLessThan(100);
  });

  it('should not reveal user existence', async () => {
    const response1 = await request(app).post('/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'password'
    });

    const response2 = await request(app).post('/auth/login').send({
      email: 'existing@example.com',
      password: 'wrongpassword'
    });

    // Both should return 401 with identical error messages
    expect(response1.status).toBe(401);
    expect(response2.status).toBe(401);
    expect(response1.body.error).toBe(response2.body.error);
  });
});
```

## Compliance Considerations

### GDPR Compliance
- **Data Minimization**: Only necessary personal data collected
- **Right to Erasure**: Proper user deletion implementation
- **Audit Trails**: Immutable security event logging

## Next Steps

1. ✅ **Review Security Features** - Understand all security capabilities
2. 📦 **Complete Installation** - See [Installation Guide](./installation.md)
3. ⚙️ **Configure Properly** - See [Configuration Guide](./configuration.md)
4. 🚀 **Deploy Securely** - See [Deployment Guide](./deployment.md)

## Support

For security-related questions or issues, refer to the [Troubleshooting Guide](./troubleshooting.md) or report security vulnerabilities responsibly to security@yourdomain.com.

