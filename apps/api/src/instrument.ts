import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  release:
    process.env.GAME_RELEASE_VERSION ??
    process.env.SOURCE_VERSION ??
    process.env.GITHUB_SHA,
  tracesSampleRate: numberFromEnv("SENTRY_TRACES_SAMPLE_RATE", 0.1),
  sendDefaultPii: false
});

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}
