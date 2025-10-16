# Email Verification Implementation Plan

## Overview

This document outlines a comprehensive plan for implementing mandatory email verification in the auth module, making it enabled by default while providing an option to disable it for backward compatibility.

## Current State Analysis

### What's Already Implemented ✅
- `emailVerifiedAt` field in User model
- Email verification token creation and storage
- Verification email sending during registration
- `/auth/verify` and `/auth/request-verify` endpoints
- Session creation during registration

### Current Issues ❌
- Login doesn't check email verification status
- Users get session cookies immediately during registration
- No configuration option to control verification enforcement

## Implementation Strategy

### 1. Configuration Layer

Add email verification configuration to `AuthModuleOptions`:

```typescript
export interface AuthModuleOptions {
  // ... existing options
  emailVerification: {
    disableEmailVerification: boolean; // default: false (verification required)
    autoSendOnRegister: boolean;       // default: true
    sessionBeforeVerification: boolean; // default: false (no session until verified)
  };
}
```

### 2. Security-First Configuration

**Default Behavior (Secure):**
- `disableEmailVerification: false` → Email verification **required** for login
- `autoSendOnRegister: true` → Verification email sent automatically on registration
- `sessionBeforeVerification: false` → No session cookie until email verified

**To Disable Verification (Permissive):**
- `disableEmailVerification: true` → Allow login without email verification

### 3. Database Schema (No Changes Required)

The existing schema already supports verification:
```prisma
model User {
  emailVerifiedAt    DateTime?
  // ... other fields
}
```

### 4. AuthService Modifications

#### Registration Flow
```typescript
async register(email: string, password: string, req: Request, res: Response) {
  // ... existing validation and user creation

  // Send verification email if not disabled
  const disableVerification = this.cfg.emailVerification?.disableEmailVerification || false;
  const shouldSendVerification = this.cfg.emailVerification?.autoSendOnRegister !== false;

  if (shouldSendVerification && !disableVerification) {
    const token = randomTokenB64url(32);
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
    });
    await this.mailer.sendVerifyEmail(user, token).catch(() => {});
  }

  // Create session only if verification is disabled OR sessions allowed before verification
  const requiresVerification = !disableVerification && !sessionBeforeVerification;

  if (!requiresVerification) {
    const sid = await this.sessions.create(user.id, req);
    this.setSessionCookie(res, sid);
  }

  return {
    status: requiresVerification ? 202 : 201,
    body: {
      id: user.id,
      email: user.email,
      requiresVerification,
      verificationSent: shouldSendVerification && !disableVerification
    }
  };
}
```

#### Login Flow
```typescript
async login(email: string, password: string, req: Request, res: Response) {
  // ... existing authentication logic

  // Check email verification if not disabled
  const disableVerification = this.cfg.emailVerification?.disableEmailVerification || false;
  if (!disableVerification && user && !user.emailVerifiedAt) {
    await this.audit.append('LOGIN_FAIL_NOT_VERIFIED', user.id, req);
    return { status: 403, body: { error: 'Email verification required' } };
  }

  // Create session for verified users
  const sid = await this.sessions.create(user.id, req);
  this.setSessionCookie(res, sid);

  return { status: 200, body: { id: user.id, email: user.email, emailVerified: !!user.emailVerifiedAt } };
}
```

#### Email Verification Flow
```typescript
async verifyEmail(token: string, req: Request, res: Response) {
  // ... existing verification logic

  // Create session if verification is required (not disabled)
  const disableVerification = this.cfg.emailVerification?.disableEmailVerification || false;
  if (!disableVerification) {
    const user = await this.prisma.user.findUnique({ where: { id: rec.userId } });
    if (user) {
      const sid = await this.sessions.create(rec.userId, req);
      this.setSessionCookie(res, sid);
    }
  }

  return { status: 204 };
}
```

### 5. Controller Updates

#### Registration Endpoint
```typescript
@Post('/auth/register')
async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
  const result = await this.auth.register(dto.email, dto.password, req, res);

  // Handle different response scenarios based on verification requirements
  if (result.body?.requiresVerification) {
    res.status(202); // 202 Accepted - verification required
  } else {
    res.status(result.status);
  }

  return result.body ?? {};
}
```

### 6. New DTOs

```typescript
// Enhanced Register Response
export class RegisterResponseDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsBoolean()
  @IsOptional()
  requiresVerification?: boolean;

  @IsBoolean()
  @IsOptional()
  verificationSent?: boolean;
}

// Enhanced Login Response
export class LoginResponseDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;
}
```

### 7. Audit Events

Add new audit event types:
- `LOGIN_FAIL_NOT_VERIFIED` - Login blocked due to unverified email
- `VERIFICATION_COMPLETED` - Email verification successful
- `SESSION_CREATED_POST_VERIFICATION` - Session created after verification

### 8. Configuration Examples

#### Secure Defaults (Recommended)
```typescript
emailVerification: {
  disableEmailVerification: false, // Email verification required (default)
  autoSendOnRegister: true,        // Send verification email automatically
  sessionBeforeVerification: false  // No session until verified
}
```

#### Permissive Configuration (Disable Verification)
```typescript
emailVerification: {
  disableEmailVerification: true,  // Allow login without verification
  autoSendOnRegister: true,        // Still send verification email
  sessionBeforeVerification: true   // Issue session immediately
}
```

#### Legacy Compatibility (No Email Verification)
```typescript
emailVerification: {
  disableEmailVerification: true,  // Disable verification completely
  autoSendOnRegister: false,       // No verification emails
  sessionBeforeVerification: true   // Issue session immediately
}
```

## Migration Strategy

### For Existing Applications

1. **Phase 1**: Deploy with default configuration (verification required)
   - Existing users without verified emails will be blocked from login
   - Send verification reminders to unverified users
   - Provide grace period for users to verify

2. **Phase 2**: Full enforcement
   - All new registrations require email verification
   - All logins require verified emails
   - Monitor verification completion rates

3. **Phase 3**: Permissive mode (if needed)
   - For applications that need to disable verification for business reasons
   - Set `disableEmailVerification: true` explicitly

### Migration Helpers

```typescript
// Admin endpoint to verify existing users
@Post('/admin/verify-users')
@RequireRole('admin')
async verifyExistingUsers() {
  // Bulk verification for users who registered before enforcement
}
```

## Security Considerations

### 1. Timing Attacks
```typescript
// Consistent response time for verification checks
const startTime = Date.now();
// ... verification logic
const processingTime = Date.now() - startTime;
if (processingTime < MIN_PROCESSING_TIME) {
  await new Promise(resolve => setTimeout(resolve, MIN_PROCESSING_TIME - processingTime));
}
```

### 2. Rate Limiting
```typescript
// Enhanced rate limits for verification flows
@Post('/auth/verify')
@RateLimit({
  key: 'verify',
  limit: 5,           // 5 attempts per window
  windowSec: 300,     // 5 minutes
  by: 'account'       // Per email account
})
```

### 3. Token Security
- Verification tokens: 32 bytes, base64url encoded
- Token hashes stored in database, not tokens themselves
- 1-hour expiration with cleanup of unused tokens
- Single-use tokens with atomic transactions

## Testing Strategy

### Unit Tests
1. Registration with different verification modes
2. Login attempts with/without verification
3. Email verification flow
4. Session creation timing
5. Audit log entries

### Integration Tests
1. Full registration → verification → login flow
2. Rate limiting enforcement
3. Session management across verification states
4. Error handling and edge cases

### End-to-End Tests
1. User journey: register → verify email → login
2. Admin scenarios: bulk verification, configuration changes
3. Security scenarios: timing attacks, brute force attempts

## Backward Compatibility

- **Default behavior preserved**: Existing installations work unchanged
- **Gradual migration**: Can enable features incrementally
- **Configuration validation**: Clear error messages for invalid configs
- **Version compatibility**: New features don't break existing integrations

## Frontend Integration Requirements

### Required Changes
1. Handle 403 responses from login attempts
2. Show verification pending state after registration
3. Display verification status in user profile
4. Handle 202 responses from registration
5. Redirect flows for unverified users

### UI States
- **Post-registration**: Show verification email sent message
- **Pre-verification**: Disable login form, show verification required
- **Post-verification**: Enable normal login flow
- **Admin override**: Allow bypassing for admin users

## Related Functionalities

### 1. Email Templates
Different content based on verification mode:
- **Required mode**: "You must verify your email to access your account"
- **Optional mode**: "Please verify your email for enhanced security"

### 2. Admin Tools
```typescript
// Admin endpoints for user management
@Get('/admin/users/:id/verification-status')
@RequireRole('admin')
async getUserVerificationStatus(@Param('id') userId: string) {
  // Return verification details for admin review
}
```

### 3. Metrics and Monitoring
- Track verification completion rates
- Monitor failed login attempts due to verification
- Alert on unusual verification patterns

## Potential Edge Cases

1. **Email delivery failures**: Retry logic and admin override
2. **Token expiration during high load**: Extend expiration or queue regeneration
3. **User verification after account suspension**: Handle reactivation flows
4. **Multiple devices**: Ensure consistent verification state across sessions

## Conclusion

This implementation provides a robust, configurable email verification system that:
- ✅ Defaults to secure behavior
- ✅ Maintains backward compatibility
- ✅ Provides clear migration path
- ✅ Handles edge cases and security concerns
- ✅ Integrates cleanly with existing architecture
- ✅ Supports operational requirements

The approach balances security, usability, and maintainability while giving applications the flexibility to choose their verification requirements.
