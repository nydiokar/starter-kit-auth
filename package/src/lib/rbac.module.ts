import { Module } from '@nestjs/common';
import { RolesGuard } from './rbac/roles.guard.js';
import { RequireRole } from './rbac/roles.decorator.js';

@Module({ providers: [RolesGuard], exports: [RolesGuard] })
export class RbacModule {}
