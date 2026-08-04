export const TELEGRAM_CHANNEL_MIN_LENGTH = 5;
export const TELEGRAM_CHANNEL_MAX_LENGTH = 32;
export const TELEGRAM_CHANNEL_PATTERN = /^@[a-z][a-z0-9_]{4,31}$/i;

export function normalizeTelegramChannel(value: string) {
  const username = value.trim().replace(/^@/, "").toLowerCase();
  return username ? `@${username}` : "";
}

export function isTelegramChannel(value: string) {
  return TELEGRAM_CHANNEL_PATTERN.test(normalizeTelegramChannel(value));
}
