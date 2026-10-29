import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Challenge Cards",
    short_name: "Challenges",
    description: "Descubre cartas, acepta desafíos personales y gana puntos.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0D14",
    theme_color: "#0B0D14",
    categories: ["games", "lifestyle", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mis retos", url: "/retos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Colección", url: "/coleccion", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
