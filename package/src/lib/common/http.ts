import type { Request } from 'express';

// Simple IP address validation regex (IPv4 and IPv6)
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

function isValidIp(ip: string): boolean {
  return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
}

export function getIp(req: Request): string {
  // Check x-forwarded-for header first (most common in proxy setups)
  const xfwd = (req.headers['x-forwarded-for'] as string) || '';

  if (xfwd) {
    // Split by comma and validate each IP
    const ips = xfwd.split(',').map(ip => ip.trim());

    // Find the first valid IP address
    for (const ip of ips) {
      if (isValidIp(ip)) {
        return ip;
      }
    }
  }

  // Fallback to socket remote address
  const socketIp = req.socket.remoteAddress || '';

  // Handle IPv6 localhost format (::1 or ::ffff:127.0.0.1)
  if (socketIp === '::1' || socketIp === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  // Handle IPv6 format (remove ::ffff: prefix if present)
  const cleanIp = socketIp.replace(/^::ffff:/, '');

  // Validate the cleaned IP
  if (isValidIp(cleanIp)) {
    return cleanIp;
  }

  // Final fallback
  return '0.0.0.0';
}

export function getUserAgent(req: Request): string {
  return (req.headers['user-agent'] as string) || '';
}

