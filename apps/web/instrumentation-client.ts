import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_GAME_RELEASE_VERSION,
  tracesSampleRate: numberFromEnv(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
  sendDefaultPii: false
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}
