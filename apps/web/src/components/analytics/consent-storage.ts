export const ANALYTICS_CONSENT_KEY = "fj.analytics-consent";
export const ANALYTICS_CONSENT_VERSION = 1;

export type AnalyticsConsent = {
  analytics: boolean;
  updatedAt: string;
  version: number;
};

export function parseAnalyticsConsent(value: string | null): AnalyticsConsent | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AnalyticsConsent>;
    if (
      parsed.version !== ANALYTICS_CONSENT_VERSION ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return parsed as AnalyticsConsent;
  } catch {
    return null;
  }
}

export function createAnalyticsConsent(analytics: boolean, updatedAt = new Date()): AnalyticsConsent {
  return {
    analytics,
    updatedAt: updatedAt.toISOString(),
    version: ANALYTICS_CONSENT_VERSION
  };
}

export function removeAccessibleYandexCookies() {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim() ?? "")
    .filter((name) => name.startsWith("_ym_") || name === "yandexuid" || name === "yuidss");

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${location.hostname}; SameSite=Lax`;
  }
}
