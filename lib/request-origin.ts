/**
 * Базовый origin для серверных редиректов в Route Handlers.
 *
 * ВАЖНО (Next 16): request.url у Route Handlers синтезируется внутренним
 * адресом приложения (localhost:PORT) и НЕ отражает публичный домен за nginx.
 * Редиректы вида new URL(path, request.url) уводят пользователя на
 * https://localhost:3000/... Поэтому origin собираем из заголовков прокси:
 * X-Forwarded-Host / Host + X-Forwarded-Proto.
 */
export function requestOrigin(request: Request, fallbackUrl = "http://localhost:3000"): string {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  if (!host) {
    const u = new URL(fallbackUrl);
    return `${u.protocol}//${u.host}`;
  }
  const proto = (request.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const isLocal = host === "localhost" || host.startsWith("127.") || host.startsWith("[::1]");
  const scheme = proto || (isLocal ? "http" : "https");
  return `${scheme}://${host}`;
}
