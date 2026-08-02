import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${publicSiteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${publicSiteUrl}/guide`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${publicSiteUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${publicSiteUrl}/personal-data-consent`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3
    }
  ];
}
