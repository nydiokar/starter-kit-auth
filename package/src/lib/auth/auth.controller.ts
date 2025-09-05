import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { RequestResetDto } from './dto/request-reset.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SessionGuard } from '../session/session.guard.js';
import { RateLimit } from '../ratelimit/ratelimit.decorator.js';
import { RateLimitGuard } from '../ratelimit/ratelimit.guard.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('/auth/register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ key: 'register', limit: 5, windowSec: 60, by: 'ip' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const r = await this.auth.register(dto.email, dto.password, req, res);
    res.status(r.status);
    return r.body ?? {};
  }

  @Post('/auth/login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ key: 'login', limit: 10, windowSec: 60, by: 'ip' }, { key: 'login', limit: 5, windowSec: 300, by: 'account' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const r = await this.auth.login(dto.email, dto.password, req, res);
    res.status(r.status);
    return r.body ?? {};
  }

  @Post('/auth/logout')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async logout(@Req() req: Request) {
    const r = await this.auth.logout(req);
    return r.body ?? {};
  }

  @Get('/auth/me')
  @UseGuards(SessionGuard)
  async me(@Req() req: Request) {
    const r = await this.auth.me(req);
    return r.body ?? {};
  }

  @Post('/auth/request-verify')
  @UseGuards(SessionGuard, RateLimitGuard)
  @RateLimit({ key: 'verify', limit: 3, windowSec: 300, by: 'account' })
  @HttpCode(204)
  async requestVerify(@Req() req: Request) {
    const r = await this.auth.requestVerify(req);
    return r.body ?? {};
  }

  @Post('/auth/verify')
  @UseGuards(RateLimitGuard)
  @RateLimit({ key: 'verify', limit: 10, windowSec: 300, by: 'account' })
  async verify(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const r = await this.auth.verifyEmail(dto.token, req);
    return r.body ?? {};
  }

  @Post('/auth/request-reset')
  @UseGuards(RateLimitGuard)
  @RateLimit({ key: 'reset', limit: 3, windowSec: 300, by: 'account' })
  @HttpCode(204)
  async requestReset(@Body() dto: RequestResetDto, @Req() req: Request) {
    const r = await this.auth.requestReset(dto.email, req);
    return r.body ?? {};
  }

  @Post('/auth/reset-password')
  @UseGuards(RateLimitGuard)
  @RateLimit({ key: 'reset', limit: 3, windowSec: 300, by: 'account' })
  @HttpCode(204)
  async reset(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const r = await this.auth.resetPassword(dto.token, dto.password, req);
    return r.body ?? {};
  }
}

