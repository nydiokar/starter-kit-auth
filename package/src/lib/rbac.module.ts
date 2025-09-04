import { Module } from '@nestjs/common';
import { RolesGuard } from './rbac/roles.guard';
import { RequireRole } from './rbac/roles.decorator';

@Module({ providers: [RolesGuard], exports: [RolesGuard, RequireRole] })
export class RbacModule {}
