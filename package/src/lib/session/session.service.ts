import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Request } from 'express';
import Redis from 'ioredis';
import { AUTH_CONFIG, AUTH_PRISMA, AUTH_REDIS, type AuthModuleOptions } from '../tokens.js';
import { getIp, getUserAgent } from '../common/http.js';
import { ipHash, randomTokenB64url } from '../common/crypto.js';

export interface SessionRecord {
  userId: string;
  createdAt: string;
  expiresAt: string;
  ipHash: string;
  ua: string;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(AUTH_REDIS) private readonly redis: Redis,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthModuleOptions,
    @Optional() @Inject(AUTH_PRISMA) private readonly prisma?: any,
  ) {}

  private key(sessionId: string): string {
    return `sess:${sessionId}`;
  }

  async create(userId: string, req: Request): Promise<string> {
    const sessionId = randomTokenB64url(32);
    const ttlSec = Math.max(1, Math.floor(this.cfg.cookie.ttlDays * 86400));
    const now = new Date();
    const rec: SessionRecord = {
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlSec * 1000).toISOString(),
      ipHash: ipHash(getIp(req), this.cfg.pepper),
      ua: getUserAgent(req),
    };
    await this.redis.set(this.key(sessionId), JSON.stringify(rec), 'EX', ttlSec);
    if (this.prisma?.session) {
      await this.prisma.session.create({
        data: {
          id: sessionId,
          userId,
          createdAt: now,
          expiresAt: new Date(now.getTime() + ttlSec * 1000),
          ipHash: rec.ipHash,
          userAgent: rec.ua,
        },
      });
    }
    return sessionId;
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.redis.get(this.key(sessionId));
    if (!raw) return null;
    
    try {
      return JSON.parse(raw) as SessionRecord;
    } catch {
      return null;
    }
  }

  async revoke(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
    if (this.prisma?.session) {
      await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
  }

  async listByPrefix(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    const stream = this.redis.scanStream({ match: `${prefix}*`, count: 100 });
    return await new Promise<string[]>((resolve, reject) => {
      stream.on('data', (resultKeys: string[]) => keys.push(...resultKeys));
      stream.on('end', () => resolve(keys));
      stream.on('error', reject);
    });
  }

  async revokeAll(userId: string): Promise<void> {
    // Best-effort: if Prisma is available, list sessions there; otherwise, fallback to key scan
    if (this.prisma?.session) {
      const sessions = await this.prisma.session.findMany({ where: { userId }, select: { id: true } });
      const ids = sessions.map((s: any) => s.id);
      if (ids.length) {
        // Delete from DB first to maintain consistency if Redis fails
        await this.prisma.session.deleteMany({ where: { userId } });
        await this.redis.del(...ids.map((id: string) => this.key(id)));
      }
      return;
    }
    // Fallback: scan all session keys and delete those belonging to user
    const keys = await this.listByPrefix('sess:');
    if (!keys.length) return;
    const pipe = this.redis.pipeline();
    for (const k of keys) {
      pipe.get(k);
    }
    const res = await pipe.exec();
    const delKeys: string[] = [];
    res?.forEach(([, val], idx) => {
      try {
        const raw = val as string;
        if (!raw) return;
        const rec = JSON.parse(raw) as SessionRecord;
        if (rec.userId === userId) delKeys.push(keys[idx]);
      } catch {}
    });
    if (delKeys.length) await this.redis.del(...delKeys);
  }

  async listForUser(userId: string): Promise<{ id: string; createdAt: Date; userAgent: string; revokedAt?: Date | null }[]> {
    if (this.prisma?.session) {
      return this.prisma.session.findMany({ where: { userId }, select: { id: true, createdAt: true, userAgent: true, revokedAt: true } });
    }
    // Fallback: approximate via Redis
    const keys = await this.listByPrefix('sess:');
    const list: { id: string; createdAt: Date; userAgent: string; revokedAt?: Date | null }[] = [];
    for (const k of keys) {
      const raw = await this.redis.get(k);
      if (!raw) continue;
      const rec = JSON.parse(raw) as SessionRecord;
      if (rec.userId === userId) {
        list.push({ id: k.replace(/^sess:/, ''), createdAt: new Date(rec.createdAt), userAgent: rec.ua, revokedAt: null });
      }
    }
    return list;
  }
}
