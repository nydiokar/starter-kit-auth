// Injection tokens and minimal interfaces for consumers to wire dependencies
export const AUTH_REDIS = Symbol('AUTH_REDIS');
export const AUTH_PRISMA = Symbol('AUTH_PRISMA');
export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
export const AUTH_MAILER = Symbol('AUTH_MAILER');

export interface CookieConfig {
  name: string;
  domain?: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  ttlDays: number;
}

export interface MailerConfig {
  from: string;
  smtp: { host: string; user: string; pass: string };
  frontendUrl: string;
}

export interface MailerPort {
  sendVerifyEmail(user: { email: string }, token: string): Promise<void>;
  sendPasswordReset(user: { email: string }, token: string): Promise<void>;
}

export interface EmailVerificationConfig {
  disableEmailVerification?: boolean; // default: false (verification required)
  autoSendOnRegister?: boolean;       // default: true
  sessionBeforeVerification?: boolean; // default: false (no session until verified)
}

export interface AuthModuleOptions {
  pepper: string;
  csrfCookieName: string;
  cookie: CookieConfig;
  redis: { url: string };
  prisma: any; // user supplies PrismaService/Client
  mailer: MailerConfig;
  // Optional: override mailer implementation. Provide a Nest provider for AUTH_MAILER.
  mailerProvider?: any;
  // Email verification configuration
  emailVerification?: EmailVerificationConfig;
}
