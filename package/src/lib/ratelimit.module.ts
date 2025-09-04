import { Module } from '@nestjs/common';
import { RateLimitGuard } from './ratelimit/ratelimit.guard';
import { RateLimit } from './ratelimit/ratelimit.decorator';

@Module({ providers: [RateLimitGuard], exports: [RateLimitGuard, RateLimit] })
export class RateLimitModule {}
