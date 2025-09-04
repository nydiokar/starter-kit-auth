import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { parse } from 'cookie';
import type { Request } from 'express';
import { AUTH_CONFIG, AUTH_PRISMA, type AuthModuleOptions } from '../tokens';
import { SessionService } from './session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthModuleOptions,
    @Optional() @Inject(AUTH_PRISMA) private readonly prisma?: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const cookies = parse(req.headers.cookie || '');
    const sid = cookies[this.cfg.cookie.name];
    if (!sid) return false;
    const rec = await this.sessions.get(sid);
    if (!rec) return false;
    if (!this.prisma?.user) return false;
    const user = await this.prisma.user.findUnique({ where: { id: rec.userId } });
    if (!user || user.isActive === false) return false;
    (req as any).user = { id: user.id, email: user.email };
    (req as any).sessionId = sid;
    return true;
  }
}

