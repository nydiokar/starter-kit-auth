import { createHash, randomBytes } from 'crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function ipHash(ip: string, pepper: string): string {
  return sha256(`${ip}|${pepper}`);
}

export function randomTokenBytes(bytes = 32): Buffer {
  return randomBytes(bytes);
}

export function randomTokenB64url(bytes = 32): string {
  return randomTokenBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

