export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const TELEGRAM_CHANNEL_MAX_LENGTH = 32;
export type AccountType = "PLAYER" | "HOST";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email) return "Введите адрес электронной почты.";
  if (email.length > EMAIL_MAX_LENGTH) return `Адрес электронной почты должен содержать не более ${EMAIL_MAX_LENGTH} символов.`;
  if (!EMAIL_PATTERN.test(email)) return "Введите адрес в формате name@example.com.";
  return null;
}

export function validatePassword(value: string) {
  if (!value) return "Введите пароль.";
  if (value.length < PASSWORD_MIN_LENGTH) return `Пароль должен содержать не менее ${PASSWORD_MIN_LENGTH} символов.`;
  if (value.length > PASSWORD_MAX_LENGTH) return `Пароль должен содержать не более ${PASSWORD_MAX_LENGTH} символов.`;
  return null;
}

export function validateResetToken(value: string) {
  return /^[a-f0-9]{64}$/i.test(value)
    ? null
    : "Ссылка восстановления недействительна. Запросите новую ссылку.";
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(value: string) {
  const name = normalizeDisplayName(value);
  if (!name) return "Введите имя игрока.";
  if (name.length < DISPLAY_NAME_MIN_LENGTH) return `Имя должно содержать не менее ${DISPLAY_NAME_MIN_LENGTH} символов.`;
  if (name.length > DISPLAY_NAME_MAX_LENGTH) return `Имя должно содержать не более ${DISPLAY_NAME_MAX_LENGTH} символов.`;
  return null;
}

export function validateAccountType(value: string): value is AccountType {
  return value === "PLAYER" || value === "HOST";
}

export function normalizeTelegramChannel(value: string) {
  const username = value.trim().replace(/^@/, "").toLowerCase();
  return username ? `@${username}` : "";
}

export function validateTelegramChannel(value: string) {
  const channel = normalizeTelegramChannel(value);
  if (!channel) return "Введите Telegram-канал.";
  if (!/^@[a-z][a-z0-9_]{4,31}$/i.test(channel)) {
    return `Используйте от 5 до ${TELEGRAM_CHANNEL_MAX_LENGTH} латинских букв, цифр или подчёркиваний после @.`;
  }
  return null;
}
