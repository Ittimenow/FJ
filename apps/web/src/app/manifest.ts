import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Финансовое путешествие",
    short_name: "Финпутешествие",
    description: "Финансовая онлайн-игра для команд и одиночных игроков.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f9ff",
    theme_color: "#112a4e",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
