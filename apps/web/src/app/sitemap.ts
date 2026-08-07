import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${publicSiteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${publicSiteUrl}/guide`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${publicSiteUrl}/materials`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${publicSiteUrl}/materials/financial-game`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${publicSiteUrl}/materials/how-to-play`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${publicSiteUrl}/materials/game-for-teams`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${publicSiteUrl}/results`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${publicSiteUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${publicSiteUrl}/personal-data-consent`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3
    }
  ];
}
