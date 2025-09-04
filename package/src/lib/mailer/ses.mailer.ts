import { Inject, Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { AUTH_CONFIG, type AuthModuleOptions, type MailerPort } from '../tokens';

@Injectable()
export class SesMailerService implements MailerPort {
  private client: SESClient;
  constructor(@Inject(AUTH_CONFIG) private readonly cfg: AuthModuleOptions) {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    this.client = new SESClient({ region });
  }

  private async send(to: string, subject: string, text: string, html: string): Promise<void> {
    const cmd = new SendEmailCommand({
      Source: this.cfg.mailer.from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text, Charset: 'UTF-8' },
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
    });
    await this.client.send(cmd);
  }

  async sendVerifyEmail(user: { email: string }, token: string): Promise<void> {
    const url = `${this.cfg.mailer.frontendUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(token)}`;
    const subject = 'Confirm your email';
    const text = `Confirm your email: ${url}`;
    const html = `<p>Confirm your email: <a href="${url}">${url}</a></p>`;
    await this.send(user.email, subject, text, html);
  }

  async sendPasswordReset(user: { email: string }, token: string): Promise<void> {
    const url = `${this.cfg.mailer.frontendUrl.replace(/\/$/, '')}/reset?token=${encodeURIComponent(token)}`;
    const subject = 'Reset your password';
    const text = `Reset your password: ${url}`;
    const html = `<p>Reset your password: <a href="${url}">${url}</a></p>`;
    await this.send(user.email, subject, text, html);
  }
}

