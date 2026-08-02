import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://financial-journey-game.d0bby.chatgpt.site/",
      lastModified: new Date("2026-07-30"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
