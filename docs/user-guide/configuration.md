# ⚙️ Configuration Guide

This guide provides a complete reference for all configuration options available in the Lean Auth Module.

## Core Configuration

### Basic Setup

```typescript
import { AuthModule } from '@lean-kit/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      pepper: process.env.AUTH_PEPPER,
      csrfCookieName: 'csrf-token',
      cookie: {
        name: 'session-id',
        domain: '.yourdomain.com',
        secure: true,
        sameSite: 'strict',
        ttlDays: 7
      },
      redis: {
        url: process.env.REDIS_URL
      },
      prisma: prismaService,
      mailer: {
        from: 'Your App <noreply@yourdomain.com>',
        smtp: {
          host: process.env.SMTP_HOST,
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        frontendUrl: 'https://yourdomain.com'
      }
    })
  ]
})
```

## Configuration Reference

### `pepper` (Required)
**Type:** `string`
**Description:** Global pepper for password hashing. Must be a cryptographically secure random string.

```typescript
pepper: process.env.AUTH_PEPPER
```

**Security Requirements:**
- Minimum 256 bits (32 bytes) of entropy
- Generate using `openssl rand -hex 32` or similar
- **Never change this value** without coordinating password resets for all users
- Store securely (environment variables, secret management systems)

### `csrfCookieName` (Required)
**Type:** `string`
**Description:** Name of the CSRF token cookie.

```typescript
csrfCookieName: 'csrf-token'
```

**Best Practices:**
- Use a descriptive name that doesn't reveal its purpose
- Keep consistent across your application

### `cookie` (Required)
**Type:** `CookieConfig`
**Description:** Session cookie configuration.

```typescript
cookie: {
  name: 'session-id',
  domain: '.yourdomain.com',     // Optional, for cross-subdomain cookies
  secure: true,                  // Required for production
  sameSite: 'strict',            // Recommended for security
  ttlDays: 7                     // Session duration in days
}
```

#### Cookie Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `name` | `string` | Cookie name | Required |
| `domain` | `string?` | Cookie domain (for subdomains) | `undefined` |
| `secure` | `boolean` | HTTPS only | Required for production |
| `sameSite` | `'strict' \| 'lax' \| 'none'` | SameSite policy | `'strict'` |
| `ttlDays` | `number` | Cookie lifetime in days | `7` |

**Security Notes:**
- `secure: true` is mandatory for production HTTPS sites
- `sameSite: 'strict'` provides best CSRF protection but may break cross-site flows
- Use `sameSite: 'lax'` if you need cross-site authentication flows

### `redis` (Required)
**Type:** `{ url: string }`
**Description:** Redis connection configuration for session storage.

```typescript
redis: {
  url: process.env.REDIS_URL || 'redis://localhost:6379'
}
```

**Supported URL Formats:**
- `redis://localhost:6379` - Local Redis
- `redis://username:password@localhost:6379` - Authenticated Redis
- `rediss://localhost:6379` - Redis over TLS
- `redis://cluster.example.com:6379` - Redis cluster

**Production Recommendations:**
- Use Redis 6+ for better performance and security
- Enable Redis AUTH for production deployments
- Use TLS (`rediss://`) for network security
- Consider Redis clustering for high availability

### `prisma` (Required)
**Type:** `PrismaClient | any`
**Description:** Prisma client instance for database operations.

```typescript
prisma: prismaService
```

**Requirements:**
- Must be a configured PrismaClient instance
- Must include all auth-related models (User, Session, etc.)
- Should be properly connected before module initialization

### `mailer` (Required)
**Type:** `MailerConfig`
**Description:** Email service configuration.

```typescript
mailer: {
  from: 'Your App <noreply@yourdomain.com>',
  smtp: {
    host: process.env.SMTP_HOST,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  frontendUrl: 'https://yourdomain.com'
}
```

#### Mailer Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `from` | `string` | Sender email address | `'App <noreply@domain.com>'` |
| `smtp.host` | `string` | SMTP server hostname | `'smtp.gmail.com'` |
| `smtp.user` | `string` | SMTP username | `'user@gmail.com'` |
| `smtp.pass` | `string` | SMTP password/token | `'app-password'` |
| `frontendUrl` | `string` | Base URL for email links | `'https://app.com'` |

**Email Provider Examples:**

```typescript
// Gmail (Development)
mailer: {
  from: 'MyApp <myapp@gmail.com>',
  smtp: {
    host: 'smtp.gmail.com',
    user: 'myapp@gmail.com',
    pass: 'your-16-char-app-password' // Generate from Gmail 2FA settings
  },
  frontendUrl: 'http://localhost:3000'
}

// SendGrid
mailer: {
  from: 'MyApp <noreply@myapp.com>',
  smtp: {
    host: 'smtp.sendgrid.net',
    user: 'apikey', // SendGrid uses 'apikey' as username
    pass: process.env.SENDGRID_API_KEY
  },
  frontendUrl: 'https://myapp.com'
}

// AWS SES
mailer: {
  from: 'MyApp <noreply@myapp.com>',
  smtp: {
    host: 'email-smtp.us-east-1.amazonaws.com',
    user: process.env.AWS_ACCESS_KEY_ID,
    pass: process.env.AWS_SECRET_ACCESS_KEY
  },
  frontendUrl: 'https://myapp.com'
}
```

### `mailerProvider` (Optional)
**Type:** `any`
**Description:** Custom mailer service implementation.

```typescript
mailerProvider: CustomMailerService
```

**Usage:**
```typescript
@Injectable()
export class CustomMailerService implements MailerPort {
  async sendVerifyEmail(user: { email: string }, token: string): Promise<void> {
    // Custom email implementation
  }

  async sendPasswordReset(user: { email: string }, token: string): Promise<void> {
    // Custom email implementation
  }
}
```

## Email Verification Configuration

### `emailVerification` (Optional)
**Type:** `EmailVerificationConfig`
**Description:** Email verification behavior configuration.

```typescript
emailVerification: {
  disableEmailVerification: false,  // Require verification by default
  autoSendOnRegister: true,         // Send verification email on registration
  sessionBeforeVerification: false  // No session until email verified
}
```

#### Email Verification Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `disableEmailVerification` | `boolean?` | `false` | Disable email verification requirement |
| `autoSendOnRegister` | `boolean?` | `true` | Send verification email on registration |
| `sessionBeforeVerification` | `boolean?` | `false` | Allow session creation before verification |

**Configuration Examples:**

```typescript
// Secure defaults (recommended)
emailVerification: {
  disableEmailVerification: false,  // Verification required
  autoSendOnRegister: true,         // Send email automatically
  sessionBeforeVerification: false  // No session until verified
}

// Permissive configuration
emailVerification: {
  disableEmailVerification: true,   // No verification required
  autoSendOnRegister: true,         // Still send email
  sessionBeforeVerification: true   // Session created immediately
}

// Custom workflow
emailVerification: {
  disableEmailVerification: false,  // Verification required
  autoSendOnRegister: false,        // Manual verification sending
  sessionBeforeVerification: false   // No session until verified
}
```

## Environment Variables

### Required Environment Variables

```bash
# Core Security (CRITICAL - Generate securely)
AUTH_PEPPER=your-256-bit-secret-here

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Redis
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM="Your App <noreply@yourdomain.com>"
FRONTEND_URL=https://yourdomain.com
```

### Optional Environment Variables

```bash
# Session Configuration
SESSION_COOKIE_NAME=session-id
CSRF_COOKIE_NAME=csrf-token
SESSION_TTL_DAYS=7

# Cookie Domain (for subdomains)
COOKIE_DOMAIN=.yourdomain.com

# Production Settings
NODE_ENV=production
```

## Advanced Configuration

### Custom Database Models

If you need to extend the default models:

```prisma
model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  emailVerifiedAt    DateTime?
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  // Your custom fields
  firstName          String?
  lastName           String?
  avatar             String?

  // Relations (required)
  password           PasswordCredential?
  sessions           Session[]
  roles              UserRole[]
  emailVerificationTokens EmailVerificationToken[]
  passwordResetTokens     PasswordResetToken[]
  auditLogs          AuditLog[]
}
```

### Custom Guards Integration

```typescript
// custom-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionGuard } from '@lean-kit/auth';

@Injectable()
export class CustomAuthGuard extends AuthGuard('custom') {
  constructor(private sessionGuard: SessionGuard) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Custom logic before session validation
    const canActivate = await this.sessionGuard.canActivate(context);

    if (!canActivate) return false;

    // Additional custom validation
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Add your custom authorization logic here
    return user.role === 'premium';
  }
}
```

### Rate Limiting Customization

```typescript
// Custom rate limiting configuration
@RateLimit([
  { key: 'custom', limit: 100, windowSec: 60, by: 'ip' },
  { key: 'custom', limit: 10, windowSec: 300, by: 'account' }
])
@Post('/custom-endpoint')
async customEndpoint() {
  // Your endpoint logic
}
```

## Security Considerations

### Password Pepper
- **Generate securely**: Use `openssl rand -hex 32` or cryptographically secure random
- **Store safely**: Use environment variables or secret management systems
- **Never change**: Changing requires resetting all user passwords

### Cookie Security
- **Always use `secure: true`** in production with HTTPS
- **Use `sameSite: 'strict'`** unless you need cross-site authentication
- **Set appropriate `ttlDays`** based on your security requirements

### Redis Security
- Use Redis AUTH in production
- Enable TLS for network encryption
- Configure proper firewall rules
- Monitor Redis memory usage

### SMTP Security
- Use TLS for email transmission
- Verify SPF, DKIM, and DMARC records
- Monitor email delivery rates
- Use dedicated SMTP credentials

## Validation and Testing

### Configuration Validation

```typescript
// config-validation.ts
export function validateAuthConfig(config: AuthModuleOptions): void {
  if (!config.pepper || config.pepper.length < 32) {
    throw new Error('AUTH_PEPPER must be at least 32 characters');
  }

  if (!config.mailer?.smtp?.host) {
    throw new Error('SMTP host is required');
  }

  if (config.cookie.secure && !config.cookie.domain?.includes('.')) {
    console.warn('Cookie domain should include subdomain for cross-subdomain auth');
  }
}
```

### Testing Configuration

```typescript
// test configuration
const testConfig: AuthModuleOptions = {
  pepper: 'test-pepper-for-testing-only',
  csrfCookieName: 'test-csrf',
  cookie: {
    name: 'test-session',
    secure: false, // Disable for testing
    sameSite: 'lax',
    ttlDays: 1
  },
  redis: { url: 'redis://localhost:6379/1' }, // Test database
  prisma: testPrismaClient,
  mailer: {
    from: 'Test <test@example.com>',
    smtp: { host: 'localhost', user: 'test', pass: 'test' },
    frontendUrl: 'http://localhost:3000'
  },
  emailVerification: {
    disableEmailVerification: true, // Disable for testing
    autoSendOnRegister: false,
    sessionBeforeVerification: true
  }
};
```

## Troubleshooting Configuration

### Common Configuration Issues

#### "Redis connection failed"
- Check Redis URL format and credentials
- Verify Redis is running and accessible
- Check firewall and network connectivity

#### "Prisma connection failed"
- Verify DATABASE_URL format and credentials
- Ensure database exists and user has permissions
- Check Prisma client generation

#### "Email sending failed"
- Verify SMTP credentials and server settings
- Check firewall allows SMTP ports (25, 465, 587)
- Ensure FROM email is authorized by SMTP provider

#### "CSRF token mismatch"
- Check CSRF cookie name configuration
- Verify cookie domain settings for production
- Ensure frontend sends correct CSRF headers

### Debugging Configuration

```typescript
// Add to your application for debugging
console.log('Auth Config:', {
  pepperLength: config.pepper?.length,
  cookieDomain: config.cookie?.domain,
  redisUrl: config.redis?.url?.replace(/:[^:]+@/, ':***@'), // Hide password
  smtpHost: config.mailer?.smtp?.host,
  frontendUrl: config.mailer?.frontendUrl
});
```

## Next Steps

1. ✅ **Review Configuration** - Ensure all settings are appropriate for your environment
2. 📚 **Learn API Usage** - See [API Reference](./api-reference.md)
3. 🔒 **Review Security** - See [Security Guide](./security.md)
4. 🚀 **Deploy to Production** - See [Deployment Guide](./deployment.md)

## Support

If you encounter configuration issues, refer to the [Troubleshooting Guide](./troubleshooting.md) or check the [GitHub Issues](https://github.com/your-repo/issues) for common solutions.
