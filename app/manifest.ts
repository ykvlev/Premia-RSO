import type { MetadataRoute } from "next";

/** PWA-манифест — сайт можно установить на телефон как приложение. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Национальная премия «Труд крут»",
    short_name: "Труд крут",
    description:
      "Национальная премия Российских студенческих отрядов «Труд крут». Подача заявок, номинации, статусы.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080a",
    theme_color: "#0804ff",
    lang: "ru",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
