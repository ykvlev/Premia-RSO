"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { clearErrors, recordError } from "@/lib/observability";
import {
  activateMaintenance,
  deactivateMaintenance,
  getMaintenanceInfo,
} from "@/lib/maintenance";

/** Очистить буфер ошибок наблюдаемости. Только супер-админ. */
export async function clearErrorBuffer(): Promise<{ ok: boolean; cleared: number }> {
  await requireRole("superadmin");
  const cleared = clearErrors();
  revalidatePath("/admin/super");
  return { ok: true, cleared };
}

/** Получить статус maintenance mode */
export async function getMaintenanceStatus() {
  await requireRole("superadmin");
  return getMaintenanceInfo();
}

/** Включить / выключить режим обслуживания (DDoS kill switch) */
export async function toggleMaintenance(
  enable: boolean,
  reason?: string,
): Promise<{ ok: boolean; error?: string; active: boolean }> {
  await requireRole("superadmin");
  try {
    if (enable) {
      activateMaintenance("superadmin", reason);
    } else {
      deactivateMaintenance();
    }
    revalidatePath("/admin/super");
    revalidatePath("/maintenance");
    return { ok: true, active: enable };
  } catch (e) {
    recordError(e, "toggleMaintenance");
    return { ok: false, error: "Не удалось переключить режим обслуживания", active: false };
  }
}

type FieldInput = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};
const FIELD_TYPES = ["text", "textarea", "number", "select", "url", "file"];

/**
 * Редактор номинации: описание + официальные поля (formSchema). Только супер-админ.
 * Название не меняем — форма подачи сопоставляет номинации по title.
 */
export async function updateNomination(
  id: string,
  data: { description: string; formSchema: FieldInput[] },
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");

  const clean: FieldInput[] = [];
  const seen = new Set<string>();
  for (const f of data.formSchema) {
    const name = (f.name || "").trim();
    const label = (f.label || "").trim();
    if (!name || !label) return { ok: false, error: "У каждого поля нужны и системное имя, и подпись." };
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name))
      return { ok: false, error: `Имя «${name}» — только латиница/цифры/подчёркивание, с буквы.` };
    if (seen.has(name)) return { ok: false, error: `Дублирующееся имя поля: ${name}` };
    if (!FIELD_TYPES.includes(f.type)) return { ok: false, error: `Недопустимый тип поля: ${f.type}` };
    seen.add(name);
    const field: FieldInput = { name, label, type: f.type };
    if (f.required) field.required = true;
    if (f.type === "select") field.options = (f.options ?? []).map((o) => o.trim()).filter(Boolean);
    clean.push(field);
  }

  try {
    await db.nomination.update({
      where: { id },
      data: { description: data.description.trim(), formSchema: clean as object },
    });
    revalidatePath("/admin/super/nominations");
    revalidatePath("/apply");
    return { ok: true };
  } catch (e) {
    recordError(e, "updateNomination");
    return { ok: false, error: "Не удалось сохранить номинацию." };
  }
}

/** Включить/выключить активность сезона. Только супер-админ. */
export async function setSeasonActive(
  seasonId: string,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  try {
    await db.season.update({ where: { id: seasonId }, data: { isActive } });
    revalidatePath("/admin/super");
    return { ok: true };
  } catch (e) {
    recordError(e, "setSeasonActive");
    return { ok: false, error: "Не удалось изменить сезон." };
  }
}
