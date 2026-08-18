import type { MetadataRoute } from "next";

const SITE_URL = "https://премиятрудкрут.рф";

/** robots.txt — индексируем публичное, закрываем кабинеты, админку и API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/jury", "/cabinet", "/api/", "/login", "/uploads/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
