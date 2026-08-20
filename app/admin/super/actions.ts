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
import { banIp, unbanIp, getBans } from "@/lib/ip-ban";
import { blockSession, unblockSession, getBlockedSessions } from "@/lib/session-blocklist";

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
    logAdminAction(enable ? "maintenance_on" : "maintenance_off", undefined, { reason });
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

// ── IP Ban ──────────────────────────────────────────────────────────────────

export async function getBanList() {
  await requireRole("superadmin");
  return getBans();
}

export async function addIpBan(
  ip: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/.test(ip.trim())) {
    return { ok: false, error: "Некорректный IP-адрес" };
  }
  banIp(ip.trim(), reason || "Banned by admin", "superadmin");
  logAdminAction("ban_ip", ip.trim(), { reason });
  revalidatePath("/admin/super");
  return { ok: true };
}

export async function removeIpBan(
  ip: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  const removed = unbanIp(ip.trim());
  if (removed) logAdminAction("unban_ip", ip.trim());
  revalidatePath("/admin/super");
  return removed ? { ok: true } : { ok: false, error: "IP не найден в банлисте" };
}

// ── Integration Test ────────────────────────────────────────────────────────

export async function testIntegrations(): Promise<{
  smtp: { ok: boolean; detail: string };
  telegram: { ok: boolean; detail: string };
  s3: { ok: boolean; detail: string };
}> {
  await requireRole("superadmin");

  // SMTP
  let smtp = { ok: false, detail: "Не настроен" };
  try {
    if (process.env.SMTP_HOST) {
      const nodemailer = require("nodemailer");
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
      });
      await transport.verify();
      smtp = { ok: true, detail: `${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}` };
    }
  } catch (e: any) {
    smtp = { ok: false, detail: e?.message || "Ошибка" };
  }

  // Telegram
  let telegram = { ok: false, detail: "Не настроен" };
  try {
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      telegram = data.ok
        ? { ok: true, detail: `@${data.result.username}` }
        : { ok: false, detail: data.description || "Ошибка" };
    }
  } catch (e: any) {
    telegram = { ok: false, detail: e?.message || "Ошибка" };
  }

  // S3
  let s3 = { ok: false, detail: "Не настроен" };
  try {
    if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
      const res = await fetch(`${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      s3 = res.ok
        ? { ok: true, detail: `${process.env.S3_BUCKET} @ ${process.env.S3_ENDPOINT}` }
        : { ok: false, detail: `HTTP ${res.status}` };
    }
  } catch (e: any) {
    s3 = { ok: false, detail: e?.message || "Ошибка" };
  }

  return { smtp, telegram, s3 };
}

// ── Impersonation ───────────────────────────────────────────────────────────

export async function impersonateUser(
  userId: string,
): Promise<{ ok: boolean; error?: string; token?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
    if (!user) return { ok: false, error: "Пользователь не найдён" };

    logAdminAction("impersonate", userId, { email: user.email, role: user.role });

    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "");
    // JWT должен содержать id и role — точно так же, как NextAuth jwt callback
    const token = await new SignJWT({
      id: user.id,
      role: user.role,
      email: user.email,
      impersonated: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    return { ok: true, token };
  } catch (e) {
    recordError(e, "impersonateUser");
    return { ok: false, error: "Ошибка создания токена" };
  }
}

// ── Test Email ──────────────────────────────────────────────────────────────

export async function sendTestEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");

  if (!process.env.SMTP_HOST) {
    return { ok: false, error: "SMTP не настроен" };
  }

  try {
    const { sendMail } = await import("@/lib/mail");
    await sendMail({
      to,
      subject,
      text: body,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="border-bottom:3px solid #0804ff;padding-bottom:12px;margin-bottom:20px;">
          <strong style="color:#0804ff;font-size:18px;">Труд Крут</strong>
        </div>
        <div style="line-height:1.6;color:#333;">${body.replace(/\n/g, "<br/>")}</div>
        <div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;color:#999;font-size:12px;">
          Национальная премия «Труд крут» · Российские студенческие отряды
        </div>
      </div>`,
    });
    return { ok: true };
  } catch (e: any) {
    recordError(e, "sendTestEmail");
    return { ok: false, error: e?.message || "Ошибка отправки" };
  }
}

// ── Mass Email ──────────────────────────────────────────────────────────────

export async function sendMassEmail(
  subject: string,
  body: string,
  target: "all" | "participants" | "jury" | "admins",
): Promise<{ ok: boolean; sent: number; error?: string }> {
  await requireRole("superadmin");

  if (!process.env.SMTP_HOST) {
    return { ok: false, sent: 0, error: "SMTP не настроен" };
  }

  try {
    const roleFilter = target === "all" ? {} : { role: (target === "participants" ? "participant" : target) as any };
    const users = await db.user.findMany({
      where: roleFilter,
      select: { email: true },
    });

    if (users.length === 0) return { ok: false, sent: 0, error: "Нет получателей" };

    const { sendMail } = await import("@/lib/mail");
    let sent = 0;

    for (const u of users) {
      try {
        await sendMail({
          to: u.email,
          subject,
          text: body,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="border-bottom:3px solid #0804ff;padding-bottom:12px;margin-bottom:20px;">
              <strong style="color:#0804ff;font-size:18px;">Труд Крут</strong>
            </div>
            <div style="line-height:1.6;color:#333;">${body.replace(/\n/g, "<br/>")}</div>
            <div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;color:#999;font-size:12px;">
              Национальная премия «Труд крут» · Российские студенческие отряды
            </div>
          </div>`,
        });
        sent++;
      } catch {
        // skip failed
      }
    }

    revalidatePath("/admin/super");
    logAdminAction("mass_email", undefined, { target, sent, subject });
    return { ok: true, sent };
  } catch (e) {
    recordError(e, "sendMassEmail");
    return { ok: false, sent: 0, error: "Ошибка массовой рассылки" };
  }
}

// ── Session Registry ────────────────────────────────────────────────────────

export async function getActiveSessions() {
  await requireRole("superadmin");

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const logins = await db.loginEvent.findMany({
    where: { success: true, createdAt: { gte: twoHoursAgo } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      userId: true,
      role: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  });

  const blocked = getBlockedSessions().map((b) => b.userId);

  // Группируем по userId — берём последний вход
  const byUser = new Map<string, typeof logins[0]>();
  for (const l of logins) {
    const key = l.userId ?? l.email;
    if (!byUser.has(key)) byUser.set(key, l);
  }

  return [...byUser.values()].map((l) => ({
    id: l.id,
    email: l.email,
    userId: l.userId,
    role: l.role,
    ip: l.ip,
    userAgent: l.userAgent,
    loginAt: l.createdAt.toISOString(),
    blocked: l.userId ? blocked.includes(l.userId) : false,
  }));
}

export async function forceLogout(
  userId: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) return { ok: false, error: "Пользователь не найдён" };

    blockSession(userId, user.email, "superadmin", reason || "Force logout by admin");
    logAdminAction("force_logout", userId, { email: user.email, reason });
    revalidatePath("/admin/super");
    return { ok: true };
  } catch (e) {
    recordError(e, "forceLogout");
    return { ok: false, error: "Ошибка" };
  }
}

export async function unblockUserSession(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  const removed = unblockSession(userId);
  revalidatePath("/admin/super");
  return removed ? { ok: true } : { ok: false, error: "Сессия не найдена в блоклисте" };
}

// ── Audit Log ─────────────────────────────────────────────────────────────

export async function logAdminAction(
  action: string,
  target?: string,
  detail?: Record<string, unknown>,
  ip?: string,
) {
  try {
    const session = await requireRole();
    await db.adminAuditLog.create({
      data: {
        actor: session.user.email ?? "unknown",
        action,
        target: target ?? undefined,
        detail: detail ? (detail as any) : undefined,
        ip: ip ?? undefined,
      },
    });
  } catch { /* best-effort */ }
}

export async function getAuditLogs(limit = 50) {
  await requireRole("superadmin");
  return db.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actor: true,
      action: true,
      target: true,
      detail: true,
      ip: true,
      createdAt: true,
    },
  });
}

// ── Quick User Actions ────────────────────────────────────────────────────

export async function resetUserPassword(
  userId: string,
): Promise<{ ok: boolean; code?: string; error?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) return { ok: false, error: "Пользователь не найдён" };

    const code = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    const { hash } = await import("bcryptjs");
    const hashVal = await hash(code, 12);

    await db.user.update({ where: { id: userId }, data: { passwordHash: hashVal } });

    logAdminAction("reset_password", userId, { email: user.email });

    return { ok: true, code };
  } catch (e) {
    recordError(e, "resetUserPassword");
    return { ok: false, error: "Ошибка сброса пароля" };
  }
}

export async function banUser(
  userId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) return { ok: false, error: "Пользователь не найдён" };

    blockSession(userId, user.email, "superadmin", reason || "Banned by admin");
    logAdminAction("ban_user", userId, { email: user.email, reason });

    revalidatePath("/admin/super");
    return { ok: true };
  } catch (e) {
    recordError(e, "banUser");
    return { ok: false, error: "Ошибка бана" };
  }
}

export async function exportUserData(
  userId: string,
): Promise<{ ok: boolean; data?: Record<string, any>; error?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fio: true, email: true, phone: true, gender: true, birthDate: true,
        city: true, region: true, telegram: true, role: true, createdAt: true,
        applications: {
          select: {
            id: true, orgName: true, status: true, createdAt: true,
            nomination: { select: { title: true } },
          },
        },
        evaluations: {
          select: { id: true, scores: true, comment: true, createdAt: true },
        },
        notifications: {
          select: { title: true, read: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!user) return { ok: false, error: "Пользователь не найдён" };

    logAdminAction("export_user_data", userId, { email: user.email });

    return {
      ok: true,
      data: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        applications: user.applications.map((a) => ({
          ...a,
          nomination: a.nomination.title,
          createdAt: a.createdAt.toISOString(),
        })),
        evaluations: user.evaluations.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
        notifications: user.notifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
      },
    };
  } catch (e) {
    recordError(e, "exportUserData");
    return { ok: false, error: "Ошибка экспорта" };
  }
}

// ── Database Health ───────────────────────────────────────────────────────

export async function getDbHealth() {
  await requireRole("superadmin");
  try {
    const tableSizes = await db.$queryRaw<{ name: string; count: bigint; size: string }[]>`
      SELECT
        c.relname AS name,
        c.reltuples::bigint AS count,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
      ORDER BY pg_total_relation_size(c.oid) DESC
    `;

    const dbSize = await db.$queryRaw<{ size: string }[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS size
    `;

    return {
      tables: tableSizes.map((t) => ({
        name: t.name,
        count: Number(t.count),
        size: t.size,
      })),
      totalSize: dbSize[0]?.size ?? "—",
    };
  } catch {
    return { tables: [], totalSize: "ошибка" };
  }
}

export async function getBlockedSessionList() {
  await requireRole("superadmin");
  return getBlockedSessions();
}

// ── Admin Profiles CRUD ──────────────────────────────────────────────────

export async function getAdminProfiles() {
  await requireRole("superadmin");
  const users = await db.user.findMany({
    where: { role: { in: ["admin", "superadmin"] } },
    select: { id: true, fio: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return users;
}

export async function createAdminProfile(
  fio: string,
  email: string,
  password: string,
  role: "admin" | "superadmin",
  phone?: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireRole("superadmin");
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return { ok: false, error: "Пользователь с таким email уже существует" };

    const { hash } = await import("bcryptjs");
    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: {
        fio,
        email,
        passwordHash,
        role,
        phone: phone || null,
      },
    });

    logAdminAction("create_admin", user.id, { email, role, fio });

    revalidatePath("/admin/super");
    return { ok: true, id: user.id };
  } catch (e) {
    recordError(e, "createAdminProfile");
    return { ok: false, error: "Ошибка создания профиля" };
  }
}

export async function updateAdminProfile(
  userId: string,
  data: { fio?: string; email?: string; phone?: string; role?: "admin" | "superadmin" },
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) return { ok: false, error: "Пользователь не найден" };

    if (data.email) {
      const dup = await db.user.findFirst({ where: { email: data.email, NOT: { id: userId } } });
      if (dup) return { ok: false, error: "Email уже используется" };
    }

    await db.user.update({ where: { id: userId }, data });
    logAdminAction("update_admin", userId, data);
    revalidatePath("/admin/super");
    return { ok: true };
  } catch (e) {
    recordError(e, "updateAdminProfile");
    return { ok: false, error: "Ошибка обновления" };
  }
}

export async function deleteAdminProfile(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true } });
    if (!user) return { ok: false, error: "Пользователь не найден" };
    if (user.role === "superadmin") {
      const count = await db.user.count({ where: { role: "superadmin" } });
      if (count <= 1) return { ok: false, error: "Нельзя удалить последнего суперадмина" };
    }

    await db.user.delete({ where: { id: userId } });
    logAdminAction("delete_admin", userId, { email: user.email });
    revalidatePath("/admin/super");
    return { ok: true };
  } catch (e) {
    recordError(e, "deleteAdminProfile");
    return { ok: false, error: "Ошибка удаления" };
  }
}

export async function resetAdminPassword(
  userId: string,
): Promise<{ ok: boolean; code?: string; error?: string }> {
  await requireRole("superadmin");
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) return { ok: false, error: "Пользователь не найден" };

    const code = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    const { hash } = await import("bcryptjs");
    const hashVal = await hash(code, 12);

    await db.user.update({ where: { id: userId }, data: { passwordHash: hashVal } });
    logAdminAction("reset_admin_password", userId, { email: user.email });

    return { ok: true, code };
  } catch (e) {
    recordError(e, "resetAdminPassword");
    return { ok: false, error: "Ошибка сброса пароля" };
  }
}
