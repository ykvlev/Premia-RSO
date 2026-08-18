"use server";

import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/net";
import type { AppStatus } from "@/lib/generated/prisma/client";

const LABEL: Record<AppStatus, string> = {
  new: "Отправлена",
  queued: "Ожидает рассмотрения",
  review: "На рассмотрении",
  revision: "Требует доработки",
  scoring: "На оценке жюри",
  finalist: "Финалист",
  winner: "Победитель",
  rejected: "Отклонена",
};

/**
 * Проверка статуса заявки без входа: по номеру (последние 6 символов, как в
 * кабинете) + email заявителя. Возвращает статус и номинацию, если совпало.
 */
export async function checkApplicationStatus(input: { number: string; email: string }) {
  // Антиперебор: не более 15 проверок с одного IP в минуту.
  if (!rateLimit(`status:${await requestIp()}`, 15, 60_000)) {
    return { ok: false as const, error: "Слишком много запросов. Попробуйте через минуту." };
  }

  const number = input.number.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = input.email.trim().toLowerCase();
  if (number.length < 4 || !email.includes("@")) {
    return { ok: false as const, error: "Укажите номер заявки и email" };
  }

  const app = await db.application.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      id: { endsWith: number },
    },
    include: { nomination: { select: { title: true } } },
  });

  if (!app) {
    return { ok: false as const, error: "Заявка не найдена. Проверьте номер и email." };
  }

  return {
    ok: true as const,
    status: LABEL[app.status],
    nomination: app.nomination.title,
    submitted: app.createdAt.toLocaleDateString("ru-RU"),
    comment: app.expertComment ?? "",
  };
}
