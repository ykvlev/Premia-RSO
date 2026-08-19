"use server";

import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type NotificationType = "info" | "warning" | "success" | "system";

// ── Получить уведомления текущего пользователя ──────────────────────────────

export async function getMyNotifications(limit = 30) {
  const session = await requireRole();
  const userId = session.user.id;

  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      link: true,
      read: true,
      createdAt: true,
    },
  });
}

export async function getUnreadCount(): Promise<number> {
  const session = await requireRole();
  const userId = session.user.id;

  return db.notification.count({
    where: { userId, read: false },
  });
}

// ── Отметить как прочитанное ────────────────────────────────────────────────

export async function markAsRead(notificationId: string): Promise<{ ok: boolean }> {
  const session = await requireRole();
  const userId = session.user.id;

  await db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });

  return { ok: true };
}

export async function markAllAsRead(): Promise<{ ok: boolean; count: number }> {
  const session = await requireRole();
  const userId = session.user.id;

  const result = await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return { ok: true, count: result.count };
}

// ── Создать уведомление (только для суперадмина) ────────────────────────────

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType = "info",
  link?: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("superadmin");

  try {
    await db.notification.create({
      data: { userId, title, body, type, link: link ?? null },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Ошибка создания уведомления" };
  }
}

// ── Массовая рассылка уведомлений в профиль ────────────────────────────────

export async function sendProfileNotifications(
  title: string,
  body: string,
  target: "all" | "participants" | "jury" | "admins",
  link?: string,
): Promise<{ ok: boolean; sent: number; error?: string }> {
  await requireRole("superadmin");

  try {
    const roleFilter = target === "all" ? {} : { role: (target === "participants" ? "participant" : target) as any };
    const users = await db.user.findMany({
      where: roleFilter,
      select: { id: true },
    });

    if (users.length === 0) return { ok: false, sent: 0, error: "Нет получателей" };

    await db.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        body,
        type: "info" as const,
        link: link ?? null,
      })),
    });

    revalidatePath("/admin/super");
    return { ok: true, sent: users.length };
  } catch (e) {
    return { ok: false, sent: 0, error: "Ошибка массовой рассылки" };
  }
}

// ── Удалить уведомление ─────────────────────────────────────────────────────

export async function deleteNotification(
  notificationId: string,
): Promise<{ ok: boolean }> {
  const session = await requireRole();
  const userId = session.user.id;

  await db.notification.deleteMany({
    where: { id: notificationId, userId },
  });

  return { ok: true };
}
