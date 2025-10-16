<div align="center">

# 🔐 Lean Auth Module

*A production-ready, security-first authentication and authorization module for NestJS applications*

[![npm version](https://badge.fury.io/js/@lean-kit/auth.svg)](https://badge.fury.io/js/@lean-kit/auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## 🌟 Overview

The **Lean Auth Module** provides a complete, enterprise-grade authentication solution for NestJS applications. Built with security as the highest priority, it offers:

- **🔒 Industry-Standard Security** - OWASP ASVS L1+ compliant with modern best practices
- **🍪 Secure Session Management** - HTTP-only cookies with Redis backend storage
- **📧 Email Verification** - Mandatory verification workflows to prevent spam accounts
- **🛡️ CSRF Protection** - Double-submit cookie pattern for state-changing requests
- **⚡ Rate Limiting** - Intelligent IP and account-based protection
- **👥 RBAC** - Role-based access control for route protection
- **📋 Audit Logging** - Comprehensive security event tracking

## 🚀 Quick Start

Get up and running in minutes:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@lean-kit/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      pepper: process.env.AUTH_PEPPER,
      cookie: { name: 'session-id', secure: true, ttlDays: 7 },
      redis: { url: process.env.REDIS_URL },
      prisma: prismaService,
      mailer: { /* SMTP configuration */ }
    })
  ]
})
export class AppModule {}
```

```bash
# Install the package
npm install @lean-kit/auth
```

## 🎯 What Makes It Special

| Feature | Benefit | Security Level |
|---------|---------|----------------|
| **Argon2id Password Hashing** | Industry-standard password security | 🔴 Critical |
| **Global Pepper** | Protection against rainbow table attacks | 🔴 Critical |
| **HTTP-Only Cookies** | XSS protection for session tokens | 🟡 High |
| **CSRF Protection** | Prevents cross-site request forgery | 🟡 High |
| **Email Verification** | Prevents spam and fake accounts | 🟡 High |
| **Rate Limiting** | DDoS and brute force protection | 🟢 Medium |
| **Audit Logging** | Complete security event tracking | 🟢 Medium |

## 📖 Documentation

### 🚀 **[User Guides](./docs/user-guide/)**
Complete guides for integrating the module into your application:

- **[Installation Guide](./docs/user-guide/installation.md)** - Step-by-step setup
- **[Configuration Guide](./docs/user-guide/configuration.md)** - All options & examples
- **[API Reference](./docs/user-guide/api-reference.md)** - Complete endpoint documentation
- **[Security Guide](./docs/user-guide/security.md)** - Best practices & compliance
- **[Deployment Guide](./docs/user-guide/deployment.md)** - Production deployment
- **[Troubleshooting](./docs/user-guide/troubleshooting.md)** - Common issues & solutions

### 🔧 **[Developer Resources](./docs/developer-guide/)**
Technical documentation for contributors and advanced users:

- **[Architecture Overview](./docs/developer-guide/overview.md)** - Design principles
- **[Implementation Details](./docs/developer-guide/implementation.md)** - Technical specs
- **[Testing Guide](./docs/developer-guide/testing.md)** - Testing strategies
- **[Packaging](./docs/developer-guide/packaging.md)** - Distribution guide

## 🏗️ Architecture Fit

**Where it fits**: Drop-in authentication module that sits between your NestJS app and database. Handles all auth concerns while you focus on your business logic.

**Dependencies**: PostgreSQL + Redis + SMTP server

**Integration**: Drop-in module that handles all authentication concerns while you focus on business logic.

## ✅ Production Ready

- ✅ **All Core Features** - Registration, login, sessions, verification, RBAC
- ✅ **Security Audited** - Multiple security reviews and penetration testing
- ✅ **Comprehensive Testing** - Unit, integration, and security test coverage
- ✅ **Production Deployment** - Docker, Kubernetes, monitoring guides included
- ✅ **Documentation Complete** - Every aspect covered for smooth implementation

## 🤝 Contributing

We welcome contributions that improve security, add features, or enhance documentation. Security improvements are especially valued.

**Guidelines**: Security-first approach, comprehensive testing required, maintain backward compatibility.

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

**🔒 Secure by Default • 🚀 Production Ready • 📚 Fully Documented**

*Built for developers who value security and reliability*

</div>
