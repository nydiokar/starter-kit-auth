import { Module } from '@nestjs/common';
import { RateLimitGuard } from './ratelimit/ratelimit.guard.js';
import { RateLimit } from './ratelimit/ratelimit.decorator.js';

@Module({ 
  providers: [RateLimitGuard], 
  exports: [RateLimitGuard],
  imports: [] // Reflector is available globally in NestJS
})
export class RateLimitModule {}
