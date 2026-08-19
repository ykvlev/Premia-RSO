/**
 * Maintenance mode: файловый флаг.
 * Файл MAINTENANCE.flag в корне проекта → сайт закрыт.
 * Убираем файл → сайт открыт.
 * Переживает рестарт Node.js, не требует БД.
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const FLAG_PATH = join(process.cwd(), "MAINTENANCE.flag");

export interface MaintenanceInfo {
  active: boolean;
  activatedAt: string | null;
  activatedBy: string | null;
  reason: string | null;
}

export function isMaintenanceActive(): boolean {
  return existsSync(FLAG_PATH);
}

export function getMaintenanceInfo(): MaintenanceInfo {
  if (!existsSync(FLAG_PATH)) {
    return { active: false, activatedAt: null, activatedBy: null, reason: null };
  }
  try {
    const raw = readFileSync(FLAG_PATH, "utf8");
    const data = JSON.parse(raw);
    return { active: true, ...data };
  } catch {
    return { active: true, activatedAt: "unknown", activatedBy: "unknown", reason: null };
  }
}

export function activateMaintenance(actor: string, reason?: string): void {
  const info = {
    activatedAt: new Date().toISOString(),
    activatedBy: actor,
    reason: reason || "DDoS protection / emergency",
  };
  writeFileSync(FLAG_PATH, JSON.stringify(info, null, 2), "utf8");
}

export function deactivateMaintenance(): void {
  if (existsSync(FLAG_PATH)) {
    unlinkSync(FLAG_PATH);
  }
}
