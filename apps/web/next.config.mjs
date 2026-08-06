import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  const config = {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    transpilePackages: ["@cashflow/shared"],
    typedRoutes: true,
    async headers() {
      return [
        {
          source: "/:path(login|register|forgot-password|reset-password|dashboard|profile|design-preview)",
          headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
        },
        {
          source: "/games/:path*",
          headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
        },
        {
          source: "/join/:path*",
          headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
        }
      ];
    }
  };

  return withSentryConfig(config, {
    silent: true,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT
  });
}
