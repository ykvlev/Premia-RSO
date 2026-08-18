import { headers } from "next/headers";

/** IP клиента из заголовков nginx-прокси (server actions / route handlers). */
export async function requestIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
