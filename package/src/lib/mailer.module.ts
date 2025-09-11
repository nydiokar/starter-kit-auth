import { Module } from '@nestjs/common';
import { AUTH_MAILER } from './tokens.js';
import { NodemailerMailerService } from './mailer/nodemailer.mailer.js';
import { SesMailerService } from './mailer/ses.mailer.js';

// Use AWS SES by default, fallback to NodeMailer if AWS_REGION not set
const useAwsSes = !!(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION);
const mailerProvider = { provide: AUTH_MAILER, useClass: useAwsSes ? SesMailerService : NodemailerMailerService };

@Module({ 
  providers: [mailerProvider], 
  exports: [AUTH_MAILER] 
})
export class MailerModule {}
