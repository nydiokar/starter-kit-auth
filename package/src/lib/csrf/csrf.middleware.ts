import { Injectable, Inject, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { parse, serialize } from 'cookie';
import { AUTH_CONFIG, type AuthModuleOptions } from '../tokens';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(@Inject(AUTH_CONFIG) private readonly cfg: AuthModuleOptions) {}

  use(req: Request, res: Response, next: NextFunction) {
    const method = req.method.toUpperCase();
    const cookies = parse(req.headers.cookie || '');
    const name = this.cfg.csrfCookieName;
    const csrf = cookies[name];
    // Set CSRF cookie on first GET if missing
    if (method === 'GET' && !csrf) {
      const token = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 32);
      res.setHeader(
        'Set-Cookie',
        serialize(name, token, {
          httpOnly: false,
          secure: this.cfg.cookie.secure,
          sameSite: this.cfg.cookie.sameSite,
          path: '/',
          domain: this.cfg.cookie.domain,
          maxAge: 60 * 60 * 24 * 30, // 30d
        }),
      );
      return next();
    }
    // Verify on mutating methods only when session cookie is present (cookie-mode flows)
    const hasSession = Boolean(cookies[this.cfg.cookie.name]);
    if (hasSession && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const header = (req.headers['x-csrf-token'] as string) || '';
      if (!csrf || !header || header !== csrf) {
        res.status(403).json({ error: 'CSRF' });
        return;
      }
    }
    next();
  }
}
