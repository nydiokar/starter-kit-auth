import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './ratelimit/ratelimit.guard.js';
import { RateLimit } from './ratelimit/ratelimit.decorator.js';

@Module({
  providers: [
    { provide: Reflector, useValue: new Reflector() },
    RateLimitGuard
  ],
  exports: [RateLimitGuard],
})
export class RateLimitModule {}
