import { CanActivate, ExecutionContext, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RL_META_KEY, RateLimitOptions } from './ratelimit.decorator';
import Redis from 'ioredis';
import { AUTH_REDIS } from '../tokens';
import type { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector, @Inject(AUTH_REDIS) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.getAllAndOverride<RateLimitOptions[]>(RL_META_KEY, [context.getHandler(), context.getClass()]);
    if (!rules || rules.length === 0) return true;
    const req = context.switchToHttp().getRequest<Request>();
    const ip = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0] || req.socket.remoteAddress || '';
    const email = (req.body?.email as string) || '';
    for (const r of rules) {
      const bucket = r.by === 'ip' ? `rl:ip:${ip}:${r.key}` : `rl:acct:${email.toLowerCase()}:${r.key}`;
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - r.windowSec;
      // Use sorted set as sliding window
      await this.redis.zremrangebyscore(bucket, 0, windowStart);
      const count = await this.redis.zcard(bucket);
      if (count >= r.limit) {
        const ttl = await this.redis.zrange(bucket, 0, 0, 'WITHSCORES').then((res) => {
          const oldest = Number(res?.[1] || now);
          return Math.max(1, r.windowSec - (now - oldest));
        });
        // Set retry-after header
        const res = context.switchToHttp().getResponse();
        res.setHeader('Retry-After', ttl);
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      await this.redis.zadd(bucket, now, `${now}:${Math.random()}`);
      await this.redis.expire(bucket, r.windowSec);
    }
    return true;
  }
}
