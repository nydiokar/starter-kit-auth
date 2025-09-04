import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  key: string; // logical key, e.g. 'login:ip' or 'login:acct'
  limit: number;
  windowSec: number;
  by: 'ip' | 'account';
}

export const RL_META_KEY = 'rate_limit';
export const RateLimit = (...rules: RateLimitOptions[]) => SetMetadata(RL_META_KEY, rules);

