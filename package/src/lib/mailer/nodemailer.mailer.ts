import { Inject, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { AUTH_CONFIG, type AuthModuleOptions, type MailerPort } from '../tokens';

@Injectable()
export class NodemailerMailerService implements MailerPort {
  private transporter: nodemailer.Transporter;
  constructor(@Inject(AUTH_CONFIG) private readonly cfg: AuthModuleOptions) {
    this.transporter = nodemailer.createTransport({
      host: this.cfg.mailer.smtp.host,
      auth: { user: this.cfg.mailer.smtp.user, pass: this.cfg.mailer.smtp.pass },
    });
  }

  async sendVerifyEmail(user: { email: string }, token: string): Promise<void> {
    const url = `${this.cfg.mailer.frontendUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(token)}`;
    await this.transporter.sendMail({
      from: this.cfg.mailer.from,
      to: user.email,
      subject: 'Confirm your email',
      text: `Confirm your email: ${url}`,
      html: `<p>Confirm your email: <a href="${url}">${url}</a></p>`,
    });
  }

  async sendPasswordReset(user: { email: string }, token: string): Promise<void> {
    const url = `${this.cfg.mailer.frontendUrl.replace(/\/$/, '')}/reset?token=${encodeURIComponent(token)}`;
    await this.transporter.sendMail({
      from: this.cfg.mailer.from,
      to: user.email,
      subject: 'Reset your password',
      text: `Reset your password: ${url}`,
      html: `<p>Reset your password: <a href="${url}">${url}</a></p>`,
    });
  }
}

