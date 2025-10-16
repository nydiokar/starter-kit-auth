# 📦 Installation Guide

This guide provides detailed instructions for installing and setting up the Lean Auth Module in your NestJS application.

## Prerequisites

Before installing the auth module, ensure you have the following dependencies:

### Required Software
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL 13+** - [Download here](https://postgresql.org/)
- **Redis 6+** - [Download here](https://redis.io/)
- **SMTP Server** - Any SMTP service (Gmail, SendGrid, AWS SES, etc.)

### Required npm Packages
```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @prisma/client prisma
npm install class-validator class-transformer
npm install ioredis
npm install argon2
npm install nodemailer
npm install @lean-kit/auth
```

## Database Setup

### 1. Install and Configure Prisma

```bash
npm install prisma -D
npx prisma init
```

### 2. Configure Database Schema

Update your `prisma/schema.prisma` file with the required models:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  emailVerifiedAt    DateTime?
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  password           PasswordCredential?
  sessions           Session[]
  roles              UserRole[]
  emailVerificationTokens EmailVerificationToken[]
  passwordResetTokens     PasswordResetToken[]
  auditLogs          AuditLog[]
}

model PasswordCredential {
  userId    String   @id
  hash      String
  algo      String   @default("argon2id")
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id         String   @id
  userId     String
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  ipHash     String
  userAgent  String
  revokedAt  DateTime?
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Role {
  id    String @id @default(cuid())
  name  String @unique
  users UserRole[]
}

model UserRole {
  userId     String
  roleId     String
  assignedAt DateTime @default(now())
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  ip        String?
  ua        String?
  kind      String
  meta      Json?
  at        DateTime @default(now())
}
```

### 3. Generate and Run Migrations

```bash
npx prisma generate
npx prisma db push
```

## Redis Setup

### Local Redis (Development)
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis
```

### Production Redis
- **AWS ElastiCache** - Recommended for production
- **Redis Labs** - Cloud Redis service
- **Self-hosted** - Ensure proper security configuration

## SMTP Configuration

Choose an SMTP provider:

### Option 1: Gmail (Development Only)
```bash
# Enable 2FA and generate App Password
# Gmail Settings > Security > 2-Step Verification > App Passwords
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

### Option 2: SendGrid (Recommended)
```bash
npm install @sendgrid/mail
# Get API key from SendGrid dashboard
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Option 3: AWS SES
```bash
npm install @aws-sdk/client-ses
# Configure AWS credentials and region
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Module Integration

### 1. Basic Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@lean-kit/auth';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    AuthModule.forRoot({
      pepper: process.env.AUTH_PEPPER,
      csrfCookieName: 'csrf-token',
      cookie: {
        name: 'session-id',
        domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        ttlDays: 7
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      },
      prisma: prismaService,
      mailer: {
        from: 'Your App <noreply@yourdomain.com>',
        smtp: {
          host: process.env.SMTP_HOST,
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
      }
    })
  ],
  providers: [PrismaService],
})
export class AppModule {}
```

### 2. Custom Mailer Implementation (Optional)

If you prefer to use a different email service:

```typescript
// custom-mailer.service.ts
import { Injectable } from '@nestjs/common';
import { MailerPort } from '@lean-kit/auth';

@Injectable()
export class CustomMailerService implements MailerPort {
  async sendVerifyEmail(user: { email: string }, token: string): Promise<void> {
    // Your custom email implementation
    await this.sendGridService.send({
      to: user.email,
      templateId: 'verification-template',
      dynamicData: { token }
    });
  }

  async sendPasswordReset(user: { email: string }, token: string): Promise<void> {
    // Your custom email implementation
    await this.sendGridService.send({
      to: user.email,
      templateId: 'reset-template',
      dynamicData: { token }
    });
  }
}

// app.module.ts
@Module({
  imports: [
    AuthModule.forRoot({
      // ... other config
      mailerProvider: CustomMailerService
    })
  ],
  providers: [CustomMailerService]
})
```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Core Security (CRITICAL - Generate securely)
AUTH_PEPPER=your-256-bit-random-secret-here-make-it-long-and-random

# Session Configuration
SESSION_COOKIE_NAME=session-id
CSRF_COOKIE_NAME=csrf-token
SESSION_TTL_DAYS=7

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Redis
REDIS_URL=redis://localhost:6379

# Email Configuration
MAIL_FROM="Your Application <noreply@yourdomain.com>"
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
FRONTEND_URL=https://yourdomain.com

# Production Settings (set these in production)
NODE_ENV=production
```

## Verification Steps

### 1. Test Database Connection
```typescript
// Test your Prisma connection
const prisma = new PrismaClient();
await prisma.$connect();
console.log('Database connected successfully');
```

### 2. Test Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

### 3. Test Email Configuration
```typescript
// Test email sending (optional)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

await transporter.sendMail({
  from: process.env.MAIL_FROM,
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'If you receive this, email is working!'
});
```

### 4. Start Your Application
```bash
npm run start:dev
```

### 5. Test Endpoints
```bash
# Register a test user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "securepassword123"}'

# Check if email verification is required
# Should return 202 Accepted with requiresVerification: true

# Verify email (you'll need to get the token from the email)
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "your-verification-token"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "securepassword123"}'
```

## Common Issues

### Database Connection Issues
- Ensure PostgreSQL is running and accessible
- Check DATABASE_URL format and credentials
- Verify database and user exist

### Redis Connection Issues
- Ensure Redis is running on the specified port
- Check REDIS_URL format
- Verify network connectivity

### Email Issues
- Verify SMTP credentials
- Check firewall settings for SMTP ports (25, 465, 587)
- Ensure FROM email is authorized by your SMTP provider

### Session Issues
- Check cookie domain settings for production
- Verify Redis connectivity and permissions
- Ensure session TTL is appropriate for your use case

## Next Steps

1. ✅ **Complete Installation** - Follow all steps above
2. 🔄 **Configure Authentication** - See [Configuration Guide](./configuration.md)
3. 📚 **Learn API Usage** - See [API Reference](./api-reference.md)
4. 🔒 **Review Security** - See [Security Guide](./security.md)
5. 🚀 **Deploy to Production** - See [Deployment Guide](./deployment.md)

## Troubleshooting

If you encounter issues during installation, refer to the [Troubleshooting Guide](./troubleshooting.md) for common solutions and debugging steps.
