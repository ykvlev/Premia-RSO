/**
 * Session blocklist — файловый блоклист JWT по user ID.
 * При force-logout добавляем userId в блоклист,
 * auth-коллбэк проверяет и отклоняет сессию.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BLOCKLIST_PATH = join(process.cwd(), "session-blocklist.json");

export interface BlockedSession {
  userId: string;
  email: string;
  blockedBy: string;
  blockedAt: string;
  reason?: string;
}

function readList(): BlockedSession[] {
  if (!existsSync(BLOCKLIST_PATH)) return [];
  try {
    return JSON.parse(readFileSync(BLOCKLIST_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeList(list: BlockedSession[]): void {
  writeFileSync(BLOCKLIST_PATH, JSON.stringify(list, null, 2), "utf8");
}

export function isSessionBlocked(userId: string): boolean {
  return readList().some((b) => b.userId === userId);
}

export function blockSession(userId: string, email: string, actor: string, reason?: string): void {
  const list = readList();
  if (!list.some((b) => b.userId === userId)) {
    list.push({ userId, email, blockedBy: actor, blockedAt: new Date().toISOString(), reason });
    writeList(list);
  }
}

export function unblockSession(userId: string): boolean {
  const list = readList();
  const before = list.length;
  const after = list.filter((b) => b.userId !== userId);
  if (after.length < before) {
    writeList(after);
    return true;
  }
  return false;
}

export function getBlockedSessions(): BlockedSession[] {
  return readList();
}
