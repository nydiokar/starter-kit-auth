import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_PRISMA } from '../tokens';
import { getIp, getUserAgent } from '../common/http';

@Injectable()
export class AuditService {
  constructor(@Optional() @Inject(AUTH_PRISMA) private readonly prisma?: any) {}

  async append(kind: string, userId?: string, req?: Request, meta?: any): Promise<void> {
    const ip = req ? getIp(req) : undefined;
    const ua = req ? getUserAgent(req) : undefined;
    if (this.prisma?.auditLog) {
      await this.prisma.auditLog.create({ data: { kind, userId: userId ?? null, ip, ua, meta } }).catch(() => {});
    }
  }
}

