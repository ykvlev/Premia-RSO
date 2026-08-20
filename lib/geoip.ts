const cache = new Map<string, { country: string; city: string; at: number }>();
const TTL = 24 * 60 * 60 * 1000;

export async function geoLookup(ip: string): Promise<{ country: string; city: string } | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: "Локальная сеть", city: "—" };
  }

  const cached = cache.get(ip);
  if (cached && Date.now() - cached.at < TTL) {
    return { country: cached.country, city: cached.city };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.status === "success") {
      const result = { country: data.country ?? "—", city: data.city ?? "—" };
      cache.set(ip, { ...result, at: Date.now() });
      return result;
    }
  } catch { /* geo не критичен */ }
  return null;
}
