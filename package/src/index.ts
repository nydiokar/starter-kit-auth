// Public API surface (skeleton)
export * from './lib/auth.module.js';
export * from './lib/session.module.js';
export * from './lib/csrf.module.js';
export * from './lib/ratelimit.module.js';
export * from './lib/rbac.module.js';
export * from './lib/mailer.module.js';
export * from './lib/audit.module.js';
export * from './lib/tokens.js';
// Mailer default implementation and port
export * from './lib/mailer/nodemailer.mailer.js';
export * from './lib/mailer/ses.mailer.js';
// Guards/Decorators
export * from './lib/session/session.guard.js';
export * from './lib/rbac/roles.decorator.js';
export * from './lib/rbac/roles.guard.js';
export * from './lib/ratelimit/ratelimit.decorator.js';
export * from './lib/ratelimit/ratelimit.guard.js';
// Services (for advanced wiring/testing)
export * from './lib/session/session.service.js';
export * from './lib/audit/audit.service.js';
export * from './lib/mailer/nodemailer.mailer.js';
