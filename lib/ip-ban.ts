/**
 * IP Ban: файловый банлист.
 * Файл bans.json в корне проекта — массив IP/CIDR.
 * Проверяется в proxy.ts на каждом запросе.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BANS_PATH = join(process.cwd(), "bans.json");

export interface BanEntry {
  ip: string; // IP или CIDR (например "1.2.3.0/24")
  reason: string;
  bannedBy: string;
  bannedAt: string;
}

function readBans(): BanEntry[] {
  if (!existsSync(BANS_PATH)) return [];
  try {
    return JSON.parse(readFileSync(BANS_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeBans(bans: BanEntry[]): void {
  writeFileSync(BANS_PATH, JSON.stringify(bans, null, 2), "utf8");
}

/** Проверить, забанен ли IP */
export function isIpBanned(ip: string): { banned: boolean; reason?: string } {
  const bans = readBans();
  for (const b of bans) {
    if (matchCidr(ip, b.ip)) {
      return { banned: true, reason: b.reason };
    }
  }
  return { banned: false };
}

/** Добавить IP в бан */
export function banIp(ip: string, reason: string, actor: string): void {
  const bans = readBans();
  if (!bans.some((b) => b.ip === ip)) {
    bans.push({ ip, reason, bannedBy: actor, bannedAt: new Date().toISOString() });
    writeBans(bans);
  }
}

/** Убрать IP из бана */
export function unbanIp(ip: string): boolean {
  const bans = readBans();
  const before = bans.length;
  const after = bans.filter((b) => b.ip !== ip);
  if (after.length < before) {
    writeBans(after);
    return true;
  }
  return false;
}

/** Получить все баны */
export function getBans(): BanEntry[] {
  return readBans();
}

/** Простое CIDR-совпадение (поддержка /32, /24, /16) */
function matchCidr(ip: string, cidr: string): boolean {
  if (ip === cidr) return true;
  if (!cidr.includes("/")) return ip === cidr;

  const [subnet, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ipToNum(ip);
  const subNum = ipToNum(subnet);
  if (ipNum === null || subNum === null) return false;
  return (ipNum & mask) === (subNum & mask);
}

function ipToNum(ip: string): number | null {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}
