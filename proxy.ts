import { NextResponse, type NextRequest } from "next/server";
import { recordRequest } from "@/lib/observability";

/**
 * Proxy (Next 16, Node-рантайм по умолчанию) — лёгкий журнал входящих запросов
 * для панели супер-админа. Пишет в общий in-process буфер observability.
 * Никогда не бросает и ничего не блокирует.
 */
export function proxy(request: NextRequest) {
  try {
    // Пропускаем RSC-префетчи/рефреши, чтобы журнал отражал реальные обращения.
    const isRsc =
      request.headers.get("rsc") === "1" ||
      request.headers.get("next-router-prefetch") === "1";
    if (!isRsc) {
      const h = request.headers;
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        undefined;
      recordRequest({
        method: request.method,
        path: request.nextUrl.pathname + (request.nextUrl.search || ""),
        ip,
        ua: h.get("user-agent")?.slice(0, 200) || undefined,
        at: Date.now(),
      });
    }
  } catch {
    /* журнал не критичен */
  }
  return NextResponse.next();
}

export const config = {
  // Всё, кроме статики Next, картинок-оптимизаций, фавикона и служебных файлов.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)"],
};
