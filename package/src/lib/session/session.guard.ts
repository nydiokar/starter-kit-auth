import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { parse } from 'cookie';
import type { Request } from 'express';
import { AUTH_CONFIG, AUTH_PRISMA, type AuthModuleOptions } from '../tokens.js';
import { SessionService } from './session.service.js';
//

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthModuleOptions,
    @Optional() @Inject(AUTH_PRISMA) private prisma?: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const req = context.switchToHttp().getRequest<Request>();
      const cookies = parse(req.headers.cookie || '');
      const sid = cookies[this.cfg.cookie.name];
      if (!sid) return false;

      const rec = await this.sessions.get(sid);
      if (!rec) return false;

      if (!this.prisma?.user) return false;

      // Use database transaction to ensure atomicity between session and user checks
      const user = await this.prisma.$transaction(async (tx: any) => {
        const session = await tx.session.findUnique({ where: { id: sid } });
        if (!session || session.revokedAt) return null;

        const user = await tx.user.findUnique({ where: { id: rec.userId } });
        if (!user || user.isActive === false) return null;

        return user;
      });

      if (!user) return false;

      (req as any).user = { id: user.id, email: user.email };
      (req as any).sessionId = sid;
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }
}
