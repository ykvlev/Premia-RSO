import type { Metadata } from "next";
import { db } from "@/lib/db";
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
 */
export default async function ApplyPage() {
  const season = await db.season.findFirst({ where: { isActive: true } });
  const noms = season
    ? await db.nomination.findMany({
        where: { seasonId: season.id },
        select: { title: true, formSchema: true },
      })
    : [];

  // Официальные поля по названию номинации (совпадает с клиентским NOMINATIONS).
  const schemas: Record<string, NomField[]> = {};
  for (const n of noms) {
    if (Array.isArray(n.formSchema)) schemas[n.title] = n.formSchema as NomField[];
  }

  return <ApplyFlow schemas={schemas} />;
}
