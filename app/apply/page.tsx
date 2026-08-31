import type { Metadata } from "next";
import { db, safeDb } from "@/lib/db";
import { ApplyFlow, type NomField } from "@/components/apply/apply-flow";

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
 * Открыта без входа — личный кабинет создаётся автоматически при подаче
 * (submitNomineeApplication заводит User по email заявителя).
 */
export default async function ApplyPage() {
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
