import type { Request } from 'express';

export function getIp(req: Request): string {
  const xfwd = (req.headers['x-forwarded-for'] as string) || '';
  const ip = (xfwd.split(',')[0] || req.socket.remoteAddress || '').trim();
  return ip || '0.0.0.0';
}

export function getUserAgent(req: Request): string {
  return (req.headers['user-agent'] as string) || '';
}

