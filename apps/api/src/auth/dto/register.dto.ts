import { Equals, IsBoolean, IsEmail, IsIn, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";
import {
  normalizeTelegramChannel,
  PERSONAL_DATA_CONSENT_VERSION,
  TELEGRAM_CHANNEL_PATTERN
} from "@cashflow/shared";
import { Transform } from "class-transformer";

export class RegisterDto {
  @IsIn(["PLAYER", "HOST"], { message: "Выберите тип аккаунта: игрок или ведущий." })
  accountType!: "PLAYER" | "HOST";

  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: "Введите корректный адрес электронной почты." })
  email!: string;

  @IsString({ message: "Введите пароль." })
  @MinLength(8, { message: "Пароль должен содержать не менее 8 символов." })
  @MaxLength(128, { message: "Пароль должен содержать не более 128 символов." })
  password!: string;

  @Transform(({ value }) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value)
  @IsString({ message: "Введите имя игрока." })
  @MinLength(2, { message: "Имя должно содержать не менее 2 символов." })
  @MaxLength(80, { message: "Имя должно содержать не более 80 символов." })
  displayName!: string;

  @Transform(({ value }) => typeof value === "string" ? normalizeTelegramChannel(value) : value)
  @IsString({ message: "Введите Telegram-канал." })
  @Matches(TELEGRAM_CHANNEL_PATTERN, {
    message: "Введите Telegram-имя из 5–32 латинских букв, цифр или подчёркиваний."
  })
  telegramChannel!: string;

  @IsUUID(undefined, { message: "Выберите город из списка." })
  cityId!: string;

  @IsBoolean({ message: "Подтвердите согласие на обработку персональных данных." })
  @Equals(true, { message: "Подтвердите согласие на обработку персональных данных." })
  personalDataConsent!: boolean;

  @IsString({ message: "Версия согласия не указана." })
  @Equals(PERSONAL_DATA_CONSENT_VERSION, { message: "Согласие устарело. Обновите страницу и попробуйте снова." })
  consentVersion!: string;
}
