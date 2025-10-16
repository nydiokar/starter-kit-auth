import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_CONFIG, AUTH_PRISMA, type AuthModuleOptions } from '../tokens.js';
import { SessionService } from '../session/session.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AUTH_MAILER, type MailerPort } from '../tokens.js';
import { buildCookie } from '../common/cookies.js';
import { hashPassword, verifyPassword, DUMMY_HASH } from '../common/password.js';
import { randomTokenB64url, sha256 } from '../common/crypto.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_CONFIG) private readonly cfg: AuthModuleOptions,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    @Inject(AUTH_MAILER) private readonly mailer: MailerPort,
    @Optional() @Inject(AUTH_PRISMA) private readonly prisma?: any,
  ) {}

  private setSessionCookie(res: Response, sessionId: string) {
    res.setHeader(
      'Set-Cookie',
      buildCookie({
        name: this.cfg.cookie.name,
        value: sessionId,
        domain: this.cfg.cookie.domain,
        secure: this.cfg.cookie.secure,
        sameSite: this.cfg.cookie.sameSite,
        maxAgeSec: Math.max(1, Math.floor(this.cfg.cookie.ttlDays * 86400)),
      }),
    );
  }

  async register(email: string, password: string, req: Request, res: Response): Promise<{ status: number; body?: any }> {
    const normalized = email.trim().toLowerCase();
    if (!this.prisma?.user || !this.prisma?.passwordCredential) throw new Error('Prisma not wired');
    const exists = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (exists) return { status: 400, body: { error: 'Invalid credentials' } };
    const hash = await hashPassword(password, this.cfg.pepper, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const user = await this.prisma.user.create({ data: { email: normalized } });
    await this.prisma.passwordCredential.create({ data: { userId: user.id, hash, algo: 'argon2id' } });
    await this.audit.append('REGISTER', user.id, req);

    // Send verification email if not disabled
    const disableVerification = this.cfg.emailVerification?.disableEmailVerification || false;
    const shouldSendVerification = this.cfg.emailVerification?.autoSendOnRegister !== false;
    const sessionBeforeVerification = this.cfg.emailVerification?.sessionBeforeVerification || false;

    if (shouldSendVerification && !disableVerification) {
      const token = randomTokenB64url(32);
      await this.prisma.emailVerificationToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
      });
      await this.mailer.sendVerifyEmail(user, token).catch(() => {});
      await this.audit.append('VERIFY_SENT', user.id, req);
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

  async login(email: string, password: string, req: Request, res: Response): Promise<{ status: number; body?: any }> {
    if (!this.prisma?.user || !this.prisma?.passwordCredential) throw new Error('Prisma not wired');
    const normalized = (email || '').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    const cred = user ? await this.prisma.passwordCredential.findUnique({ where: { userId: user.id } }) : null;
    const ok = await verifyPassword(cred?.hash || DUMMY_HASH, password || '', this.cfg.pepper);

    // Check email verification if not disabled
    const disableVerification = this.cfg.emailVerification?.disableEmailVerification || false;
    if (!disableVerification && user && !user.emailVerifiedAt) {
      await this.audit.append('LOGIN_FAIL_NOT_VERIFIED', user.id, req);
      return { status: 403, body: { error: 'Email verification required' } };
    }

    if (!user || !ok || user.isActive === false) {
      await this.audit.append('LOGIN_FAIL', user?.id, req);
      return { status: 401, body: { error: 'Invalid credentials' } };
    }

    const sid = await this.sessions.create(user.id, req);
    this.setSessionCookie(res, sid);
    await this.audit.append('LOGIN_SUCCESS', user.id, req);
    return { status: 200, body: { id: user.id, email: user.email, emailVerified: !!user.emailVerifiedAt } };
  }

  async logout(req: Request): Promise<{ status: number; body?: any }> {
    const sid = (req as any).sessionId as string | undefined;
    if (sid) await this.sessions.revoke(sid);
    return { status: 204 };
  }

  async me(req: Request): Promise<{ status: number; body?: any }> {
    const user = (req as any).user as { id: string; email: string } | undefined;
    if (!user) return { status: 401, body: { error: 'Unauthorized' } };
    return { status: 200, body: user };
  }

  async requestVerify(req: Request): Promise<{ status: number; body?: any }> {
    const user = (req as any).user as { id: string; email: string } | undefined;
    if (!user || !this.prisma?.emailVerificationToken) return { status: 401, body: { error: 'Unauthorized' } };
    const token = randomTokenB64url(32);
    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
    });
    await this.mailer.sendVerifyEmail({ email: user.email }, token).catch(() => {});
    await this.audit.append('VERIFY_SENT', user.id, req);
    return { status: 204 };
  }

  async verifyEmail(token: string, req: Request, res: Response): Promise<{ status: number; body?: any }> {
    if (!this.prisma?.emailVerificationToken || !this.prisma?.user) throw new Error('Prisma not wired');
    const hash = sha256(token);
    const rec = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash: hash } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { status: 400, body: { error: 'Invalid token' } };

    const disableVerification = this.cfg.emailVerification?.disableEmailVerification || false;

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
      this.prisma.emailVerificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId: rec.userId, usedAt: null, id: { not: rec.id } } }),
    ]);

    await this.audit.append('VERIFY_OK', rec.userId, req);

    // Create session if verification is required (not disabled)
    if (!disableVerification) {
      const user = await this.prisma.user.findUnique({ where: { id: rec.userId } });
      if (user) {
        const sid = await this.sessions.create(rec.userId, req);
        this.setSessionCookie(res, sid);
        await this.audit.append('SESSION_CREATED_POST_VERIFICATION', rec.userId, req);
      }
    }

    return { status: 204 };
  }

  async requestReset(email: string, req: Request): Promise<{ status: number; body?: any }> {
    if (!this.prisma?.passwordResetToken || !this.prisma?.user) throw new Error('Prisma not wired');
    const user = await this.prisma.user.findUnique({ where: { email: (email || '').trim().toLowerCase() } });
    if (user) {
      const token = randomTokenB64url(32);
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 1000 * 60 * 30) },
      });
      await this.mailer.sendPasswordReset({ email: user.email }, token).catch(() => {});
      await this.audit.append('RESET_REQ', user.id, req);
    }
    // Always 204 to avoid enumeration
    return { status: 204 };
  }

  async resetPassword(token: string, newPassword: string, req: Request): Promise<{ status: number; body?: any }> {
    if (!this.prisma?.passwordResetToken || !this.prisma?.passwordCredential) throw new Error('Prisma not wired');
    const rec = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { status: 400, body: { error: 'Invalid token' } };
    const hash = await hashPassword(newPassword, this.cfg.pepper, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await this.prisma.$transaction([
      this.prisma.passwordCredential.upsert({
        where: { userId: rec.userId },
        create: { userId: rec.userId, hash, algo: 'argon2id' },
        update: { hash, algo: 'argon2id' },
      }),
      this.prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      this.prisma.session.deleteMany({ where: { userId: rec.userId } }),
    ]);
    await this.sessions.revokeAll(rec.userId);
    await this.audit.append('RESET_OK', rec.userId, req);
    return { status: 204 };
  }
}
