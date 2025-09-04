import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { AUTH_PRISMA } from '../tokens';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, @Optional() @Inject(AUTH_PRISMA) private readonly prisma?: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string } | undefined;
    if (!user?.id || !this.prisma?.userRole) return false;
    const roles = await this.prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
    const names = new Set((roles || []).map((r: any) => r.role?.name).filter(Boolean));
    return required.some((r) => names.has(r));
  }
}

