import type { Metadata } from "next";
import { db, safeDb } from "@/lib/db";
import { ApplyFlow, type NomField } from "@/components/apply/apply-flow";
import { requireCompleteProfile } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "Подать заявку",
  description:
    "Подача заявки на Национальную премию «Труд крут». Выберите номинацию, заполните официальные поля номинации и приложите материалы.",
};

export const dynamic = "force-dynamic";

/**
 * Форма подачи заявки — тёмный визард. Шаг «Данные по номинации» рендерится
 * динамически из formSchema выбранной номинации (официальные поля приложений
 * к положению премии). Отправка → submitNomineeApplication.
 *
 * Требуется заполненный профиль (ФИО, телефон, регион, город, пол, дата рождения).
 */
export default async function ApplyPage() {
  // Блокируем подачу заявки если профиль не заполнен
  await requireCompleteProfile();

  const schemas = await safeDb(async () => {
    const season = await db.season.findFirst({ where: { isActive: true } });
    const noms = season
      ? await db.nomination.findMany({
          where: { seasonId: season.id },
          select: { title: true, formSchema: true },
        })
      : [];

    const result: Record<string, NomField[]> = {};
    for (const n of noms) {
      if (Array.isArray(n.formSchema)) result[n.title] = n.formSchema as NomField[];
    }
    return result;
  }, {} as Record<string, NomField[]>);

  return <ApplyFlow schemas={schemas} />;
}
