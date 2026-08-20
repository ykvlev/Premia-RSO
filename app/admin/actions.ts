"use server";

import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { renderBroadcastEmail, renderStatusEmail } from "@/lib/email";
import { brand } from "@/lib/brand";
import type { AppStatus } from "@/lib/generated/prisma/client";

/** Цвет статуса для бейджа в письме (палитра брендбука РСО). */
const STATUS_COLOR: Record<AppStatus, string> = {
  new: "#0453FF",
  queued: "#8a8a92",
  review: "#FE9633",
  revision: "#FF794C",
  scoring: "#8043F9",
  finalist: "#4CACF7",
  winner: "#0804FF",
  rejected: "#E61F25",
};

/** Статусы макета админки → enum БД (approved ↔ finalist). */
const MOCK_TO_DB: Record<string, AppStatus> = {
  new: "new",
  queued: "queued",
  review: "review",
  revision: "revision",
  scoring: "scoring",
  approved: "finalist",
  rejected: "rejected",
  winner: "winner",
};

/** Текст письма заявителю по новому статусу (null — письмо не шлём). */
const STATUS_MAIL: Partial<Record<AppStatus, { subject: string; line: string }>> = {
  queued: {
    subject: "Заявка принята",
    line: "Ваша заявка принята и поставлена в очередь на рассмотрение экспертами премии.",
  },
  review: {
    subject: "Заявка на рассмотрении",
    line: "Ваша заявка принята на рассмотрение экспертами премии.",
  },
  revision: {
    subject: "Заявка требует доработки",
    line: "По вашей заявке требуется доработка. Пожалуйста, ознакомьтесь с комментарием эксперта (в отдельном письме) и при необходимости свяжитесь с оргкомитетом.",
  },
  scoring: {
    subject: "Заявка передана жюри",
    line: "Ваша заявка передана жюри премии для экспертной оценки.",
  },
  finalist: {
    subject: "Заявка одобрена",
    line: "Поздравляем! Ваша заявка одобрена — вы в числе финалистов премии.",
  },
  winner: {
    subject: "Вы победитель!",
    line: "Поздравляем! Ваша заявка признана победителем Национальной премии «Труд крут».",
  },
  rejected: {
    subject: "Решение по заявке",
    line: "К сожалению, в этом сезоне ваша заявка не прошла отбор. Благодарим за участие.",
  },
};

/**
 * ОДНО фирменное письмо заявителю по итогам сохранения карточки:
 * смена статуса и/или комментарий эксперта — вместе, а не двумя письмами.
 * Ничего не шлёт, если не изменилось ни то, ни другое. Безопасно к падениям.
 */
async function mailStatusUpdate(
  id: string,
  opts: { newStatus?: AppStatus; comment?: string },
) {
  if (!opts.newStatus && !opts.comment) return;
  const app = await db.application.findUnique({
    where: { id },
    select: {
      email: true,
      contactFio: true,
      nomination: { select: { title: true } },
    },
  });
  if (!app || !app.email.includes("@")) return;

  const meta = opts.newStatus ? STATUS_MAIL[opts.newStatus] : undefined;
  const { html, text } = renderStatusEmail({
    name: app.contactFio,
    nominationTitle: app.nomination.title,
    appId: id,
    statusLabel: opts.newStatus ? STATUS_LABEL_RU[opts.newStatus] : undefined,
    statusLine: meta?.line,
    statusColor: opts.newStatus ? STATUS_COLOR[opts.newStatus] : undefined,
    comment: opts.comment,
  });
  const subject =
    (meta?.subject ?? (opts.newStatus ? "Обновление по заявке" : "Комментарий по заявке")) +
    ` — ${brand.fullName}`;
  try {
    await sendMail({ to: app.email, subject, text, html });
  } catch (e) {
    console.error("Письмо об обновлении заявки не отправлено:", e);
  }
}

/**
 * Сохранение статуса + комментария эксперта из карточки заявки.
 * Письмо о статусе — если статус изменился; письмо с комментарием —
 * если комментарий появился/изменился и не пустой.
 */
const STATUS_LABEL_RU: Record<AppStatus, string> = {
  new: "Отправлена",
  queued: "Ожидает рассмотрения",
  review: "На рассмотрении",
  revision: "Требует доработки",
  scoring: "На оценке жюри",
  finalist: "Финалист",
  winner: "Победитель",
  rejected: "Отклонена",
};

/** Запись события в историю заявки (аудит). Безопасно к падениям. */
async function logEvent(applicationId: string, actor: string, action: string) {
  try {
    await db.applicationEvent.create({ data: { applicationId, actor, action } });
  } catch (e) {
    console.error("Событие не записано:", e);
  }
}

export async function saveApplication(
  id: string,
  mockStatus: string,
  expertComment: string,
  internalNote = "",
) {
  const session = await requireRole("admin", "superadmin");
  const actor = session.user.email ?? "оргкомитет";
  const status = MOCK_TO_DB[mockStatus];
  if (!status) return { ok: false as const, error: "Неизвестный статус" };

  const before = await db.application.findUnique({
    where: { id },
    select: { status: true, expertComment: true, internalNote: true },
  });
  const comment = expertComment.trim();
  const note = internalNote.trim();

  await db.application.update({
    where: { id },
    data: { status, expertComment: comment || null, internalNote: note || null },
  });

  const statusChanged = !!before && before.status !== status;
  const commentChanged = !!comment && comment !== (before?.expertComment ?? "").trim();

  // Одно письмо на оба изменения (статус + публичный комментарий).
  if (statusChanged || commentChanged) {
    await mailStatusUpdate(id, {
      newStatus: statusChanged ? status : undefined,
      comment: commentChanged ? comment : undefined,
    });
  }

  // Аудит-лог — по каждому изменению отдельной записью.
  if (statusChanged) await logEvent(id, actor, `Статус → «${STATUS_LABEL_RU[status]}»`);
  if (commentChanged) await logEvent(id, actor, "Обновлён комментарий эксперта");
  if (note !== (before?.internalNote ?? "").trim()) {
    await logEvent(id, actor, note ? "Обновлена внутренняя заметка" : "Удалена заметка");
  }
  return { ok: true as const };
}

/**
 * Сохранение статуса заявки из тёмной админки (макет заказчика).
 * Проверка прав — admin/superadmin. approved (макет) → finalist (БД).
 * Заявителю уходит письмо о новом статусе.
 */
export async function updateApplicationStatus(id: string, mockStatus: string) {
  const session = await requireRole("admin", "superadmin");
  const status = MOCK_TO_DB[mockStatus];
  if (!status) return { ok: false as const, error: "Неизвестный статус" };
  await db.application.update({ where: { id }, data: { status } });
  await mailStatusUpdate(id, { newStatus: status });
  await logEvent(id, session.user.email ?? "оргкомитет", `Статус → «${STATUS_LABEL_RU[status]}»`);
  return { ok: true as const };
}

/** Удаление заявки со связанными записями (только admin/superadmin). */
export async function deleteApplication(id: string) {
  await requireRole("admin", "superadmin");
  await db.$transaction([
    db.evaluation.deleteMany({ where: { applicationId: id } }),
    db.attachment.deleteMany({ where: { applicationId: id } }),
    db.juryRecusal.deleteMany({ where: { applicationId: id } }),
    db.application.delete({ where: { id } }),
  ]);
  return { ok: true as const };
}

/** Массовая смена статуса (bulk-действия в списке) — с письмами каждому. */
export async function bulkUpdateStatus(ids: string[], mockStatus: string) {
  const session = await requireRole("admin", "superadmin");
  const status = MOCK_TO_DB[mockStatus];
  if (!status || ids.length === 0) return { ok: false as const };
  await db.application.updateMany({ where: { id: { in: ids } }, data: { status } });
  const actor = session.user.email ?? "оргкомитет";
  await Promise.all([
    ...ids.map((id) => mailStatusUpdate(id, { newStatus: status })),
    ...ids.map((id) => logEvent(id, actor, `Статус → «${STATUS_LABEL_RU[status]}» (массово)`)),
  ]);
  return { ok: true as const };
}

/**
 * Массовая рассылка заявителям (только admin/superadmin).
 * Фильтр по статусу (макет-значение) и/или номинации; получатели дедуплицируются
 * по email. Письма шлются последовательно, чтобы не превышать лимиты SMTP.
 */
export async function broadcastMail(input: {
  subject: string;
  body: string;
  status?: string;
  nominationId?: string;
  customEmails?: string;
}) {
  await requireRole("admin", "superadmin");
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) {
    return { ok: false as const, error: "Заполните тему и текст письма" };
  }

  const where: { status?: AppStatus; nominationId?: string } = {};
  if (input.status && input.status !== "all") {
    const dbStatus = MOCK_TO_DB[input.status];
    if (dbStatus) where.status = dbStatus;
  }
  if (input.nominationId && input.nominationId !== "all") {
    where.nominationId = input.nominationId;
  }

  const rows = await db.application.findMany({
    where,
    select: { email: true, contactFio: true },
  });

  // дедуп по email (одному человеку — одно письмо, даже если заявок несколько)
  const recipients = new Map<string, string>();
  for (const r of rows) {
    const email = r.email.trim().toLowerCase();
    if (email.includes("@") && !recipients.has(email)) {
      recipients.set(email, r.contactFio);
    }
  }

  // Добавляем кастомные email
  if (input.customEmails) {
    const customList = input.customEmails
      .split(/[,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
    for (const email of customList) {
      if (!recipients.has(email)) {
        recipients.set(email, email.split("@")[0]);
      }
    }
  }

  if (recipients.size === 0) {
    return { ok: false as const, error: "Нет получателей" };
  }

  // Дедлайн приёма — из активного сезона (для callout в письме).
  const season = await db.season.findFirst({
    where: { isActive: true },
    select: { endAt: true },
  });
  const deadline = season
    ? season.endAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : undefined;

  let sent = 0;
  let failed = 0;
  for (const [email, name] of recipients) {
    try {
      const { html, text } = renderBroadcastEmail({ name, body, deadline });
      await sendMail({
        to: email,
        subject: `${subject} — ${brand.fullName}`,
        text,
        html,
      });
      sent++;
    } catch (e) {
      failed++;
      console.error("Рассылка: письмо не отправлено", email, e);
    }
  }
  return { ok: true as const, total: recipients.size, sent, failed };
}

/**
 * Предпросмотр письма рассылки: возвращает отрисованный HTML (для iframe в форме).
 * Имя получателя — образец. Только admin/superadmin.
 */
export async function previewBroadcastEmail(
  body: string,
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  await requireRole("admin", "superadmin");
  const text = body.trim();
  if (!text) return { ok: false, error: "Введите текст письма для предпросмотра" };
  const season = await db.season.findFirst({
    where: { isActive: true },
    select: { endAt: true },
  });
  const deadline = season
    ? season.endAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : undefined;
  const { html } = renderBroadcastEmail({ name: "Имя Получателя", body: text, deadline });
  return { ok: true, html };
}
