import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";
import { publicResultSitemapEntries } from "@/lib/results";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicResults = await publicResultSitemapEntries();
  return [
    { url: `${publicSiteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${publicSiteUrl}/guide`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${publicSiteUrl}/materials`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${publicSiteUrl}/materials/financial-game`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${publicSiteUrl}/materials/how-to-play`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${publicSiteUrl}/materials/game-for-teams`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${publicSiteUrl}/results`, changeFrequency: "weekly", priority: 0.7 },
    ...publicResults.map(({ id, updatedAt }) => ({
      url: `${publicSiteUrl}/results/${id}`,
      lastModified: new Date(updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6
    })),
    { url: `${publicSiteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${publicSiteUrl}/personal-data-consent`,
      changeFrequency: "yearly",
      priority: 0.3
    }
  ];
}
