import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 587);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    } else {
      this.logger.warn("SMTP not configured — emails will be skipped");
    }
  }

  async sendPasswordChanged(to: string, displayName: string) {
    if (!this.transporter) return;

    const from =
      this.config.get<string>("SMTP_FROM") ??
      this.config.get<string>("SMTP_USER") ??
      "no-reply@financialjourney.app";

    const date = new Date().toLocaleString("ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Moscow"
    });

    await this.transporter
      .sendMail({
        from,
        to,
        subject: "Пароль был изменён — Financial Journey",
        html: `
          <p>Здравствуйте, ${displayName}!</p>
          <p>Пароль вашего аккаунта <strong>${to}</strong> был успешно изменён ${date}.</p>
          <p>Если это были не вы — немедленно обратитесь к администратору.</p>
          <br/>
          <p>Financial Journey</p>
        `
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to send password-changed email to ${to}`, err);
      });
  }
}
