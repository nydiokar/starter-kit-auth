import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './rbac/roles.guard.js';
import { RequireRole } from './rbac/roles.decorator.js';

@Module({
  providers: [
    { provide: Reflector, useValue: new Reflector() },
    RolesGuard
  ],
  exports: [RolesGuard]
})
export class RbacModule {}
