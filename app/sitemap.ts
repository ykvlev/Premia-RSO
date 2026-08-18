import type { MetadataRoute } from "next";

const SITE_URL = "https://премиятрудкрут.рф";

/** Карта сайта — только публичные страницы (кабинеты/админка закрыты). */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, freq: "weekly" },
    { path: "/apply", priority: 0.9, freq: "monthly" },
    { path: "/pobediteli", priority: 0.7, freq: "monthly" },
    { path: "/vhod", priority: 0.5, freq: "yearly" },
    { path: "/privacy", priority: 0.3, freq: "yearly" },
  ];
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: new Date(),
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
