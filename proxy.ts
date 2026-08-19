import { NextResponse, type NextRequest } from "next/server";
import { recordRequest } from "@/lib/observability";
import { isMaintenanceActive } from "@/lib/maintenance";
import { isIpBanned } from "@/lib/ip-ban";

/**
 * Proxy (Next 16, Node-рантайм по умолчанию) — журнал запросов + maintenance mode.
 * При включённом maintenance mode все запросы (кроме /api, /admin, статики) перенаправляются на /maintenance.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Maintenance mode: блокируем всё кроме API, админки, статики ──────────
  try {
    if (
      isMaintenanceActive() &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/brand") &&
      !pathname.includes(".")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url);
    }
  } catch {
    /* fallback: если файл не читается — пропускаем */
  }

  // ── IP Ban: блокируем забаненные IP ───────────────────────────────────────
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";
    if (ip) {
      const { banned, reason } = isIpBanned(ip);
      if (banned) {
        return new NextResponse(
          JSON.stringify({ error: "Blocked", reason: reason || "Access denied" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  } catch {
    /* ban check failure — don't block */
  }

  // ── Request logging ──────────────────────────────────────────────────────
  try {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)"],
};
