import { serialize } from 'cookie';

export interface CookieOptions {
  name: string;
  value: string;
  domain?: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAgeSec: number;
}

export function buildCookie(opts: CookieOptions): string {
  return serialize(opts.name, opts.value, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: '/',
    domain: opts.domain,
    maxAge: opts.maxAgeSec,
  });
}

