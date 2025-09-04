// Public API surface (skeleton)
export * from './lib/auth.module';
export * from './lib/session.module';
export * from './lib/csrf.module';
export * from './lib/ratelimit.module';
export * from './lib/rbac.module';
export * from './lib/mailer.module';
export * from './lib/audit.module';
export * from './lib/tokens';
// Guards/Decorators
export * from './lib/session/session.guard';
export * from './lib/rbac/roles.decorator';
export * from './lib/rbac/roles.guard';
export * from './lib/ratelimit/ratelimit.decorator';
export * from './lib/ratelimit/ratelimit.guard';
// Services (for advanced wiring/testing)
export * from './lib/session/session.service';
export * from './lib/audit/audit.service';
export * from './lib/mailer/mailer.service';
