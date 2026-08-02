import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/design-preview",
        "/forgot-password",
        "/games/",
        "/join/",
        "/login",
        "/profile",
        "/register",
        "/reset-password"
      ]
    },
    sitemap: `${publicSiteUrl}/sitemap.xml`,
    host: publicSiteUrl
  };
}
