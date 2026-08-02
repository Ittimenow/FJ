import type { Route } from "next";

export function safeAuthCallbackUrl(value?: string) {
  return (value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard") as Route;
}

export function inviteCodeFromCallbackUrl(value: string) {
  const match = /^\/join\/([^/?#]+)/.exec(value);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
