import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type RegistrationNotification = {
  email: string;
  displayName: string;
  accountType: "PLAYER" | "HOST";
  telegramChannel: string;
  city: string;
  registeredAt: Date;
};

@Injectable()
export class TelegramRegistrationService {
  private readonly logger = new Logger(TelegramRegistrationService.name);
  private readonly botToken: string;
  private readonly chatId: string;

  constructor(private readonly config: ConfigService) {
    this.botToken = (this.config.get<string>("TELEGRAM_BOT_TOKEN") ?? "").trim();
    this.chatId = (this.config.get<string>("TELEGRAM_CHAT_ID") ?? "").trim();

    if ((this.botToken && !this.chatId) || (!this.botToken && this.chatId)) {
      this.logger.warn(
        "Telegram registration notifications are partially configured and will be skipped"
      );
    }
  }

  async sendRegistration(notification: RegistrationNotification) {
    if (!this.botToken || !this.chatId) return;

    const accountType = notification.accountType === "HOST" ? "Ведущий" : "Игрок";
    const registeredAt = notification.registeredAt.toLocaleString("ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Moscow"
    });
    const text = [
      "🆕 Новая регистрация",
      `Имя: ${notification.displayName}`,
      `Email: ${notification.email}`,
      `Telegram: ${notification.telegramChannel}`,
      `Город: ${notification.city}`,
      `Тип аккаунта: ${accountType}`,
      `Дата: ${registeredAt} (МСК)`
    ].join("\n");

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            disable_web_page_preview: true
          }),
          signal: AbortSignal.timeout(5_000)
        }
      );

      if (!response.ok) {
        this.logger.error(
          `Telegram registration notification failed with status ${response.status}`
        );
      }
    } catch {
      this.logger.error("Telegram registration notification request failed");
    }
  }
}
