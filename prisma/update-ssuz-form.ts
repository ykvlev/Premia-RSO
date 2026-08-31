import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

/**
 * Разовый скрипт: обновляет formSchema номинации «ссузы и школы» на
 * ту, что теперь определена в prisma/seed.ts (Положение §7 — заявка
 * на бланке организации + подтверждающие документы). Не трогает
 * остальные номинации и другие поля этой (title/description/criteria
 * оставляем как есть).
 */

const TITLE =
  "Лучшая практика организации деятельности студотрядов в профессиональной и общеобразовательной организации";

const formSchema = [
  { name: "orgName", label: "Наименование образовательной организации", type: "text", required: true },
  {
    name: "applicationScan",
    label: "Заявка на бланке организации (Приложение №1) — подписана руководителем и заверена печатью ОО, скан в формате PDF",
    type: "file",
    required: true,
  },
  {
    name: "supportingDocs",
    label:
      "Подтверждающие документы: информационные справки №1–2 (Приложения №2–3), паспорт инфраструктурного объекта (Приложение №4, при наличии), сканы грамот/дипломов и благодарственных писем — объединить в один файл PDF",
    type: "file",
    required: true,
  },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const nom = await prisma.nomination.findFirst({ where: { title: TITLE } });
  if (!nom) {
    console.error("Номинация не найдена:", TITLE);
    process.exit(1);
  }
  await prisma.nomination.update({
    where: { id: nom.id },
    data: { formSchema: formSchema as object },
  });
  console.log(`Обновлено: ${TITLE} (id ${nom.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
