import { Module } from '@nestjs/common';
import { AUTH_MAILER } from './tokens';
import { NodemailerMailerService } from './mailer/nodemailer.mailer';

@Module({ providers: [{ provide: AUTH_MAILER, useClass: NodemailerMailerService }], exports: [AUTH_MAILER] })
export class MailerModule {}
