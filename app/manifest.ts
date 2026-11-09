import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Postai — social media com IA",
    short_name: "Postai",
    description: "Fotografe, edite com IA e planeje seus posts do Instagram e TikTok.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0f14",
    theme_color: "#0f0f14",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
