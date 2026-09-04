import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_FROM } from '@app/common';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      ignoreTLS: true,
    });
  }

  async sendOtpCode(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Код входа в Nova',
      text: `Ваш одноразовый код для входа в Nova: ${code}\n\nКод действует 10 минут. Если вы не запрашивали вход — просто игнорируйте письмо.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1f2328;">
          <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Вход в Nova</h2>
          <p style="margin: 0 0 12px; color: #424a53;">Ваш одноразовый код для входа:</p>
          <p style="margin: 0 0 16px; font-size: 32px; letter-spacing: 8px; font-weight: 600; font-family: 'SFMono-Regular', Consolas, monospace;">${code}</p>
          <p style="margin: 0; color: #6e7781; font-size: 14px;">Код действует 10 минут. Если вы не запрашивали вход — просто игнорируйте письмо.</p>
        </div>
      `,
    });
  }
}
