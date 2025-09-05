import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';

@Controller()
@UseGuards(SessionGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionService) {}

  @Get('/sessions')
  async list(@Req() req: Request) {
    const user = (req as any).user as { id: string } | undefined;
    if (!user) return [];
    return this.sessions.listForUser(user.id);
  }

  @Post('/sessions/:id/revoke')
  async revoke(@Param('id') id: string) {
    await this.sessions.revoke(id);
    return { ok: true };
  }
}

