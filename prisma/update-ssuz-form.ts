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
  "«Лучшая практика организации деятельности студотрядов в профессиональной и общеобразовательной организации»";

const formSchema = [
  { name: "orgName", label: "Наименование образовательной организации", type: "text", required: true },
  {
    name: "applicationScan",
    label: "Форма заявки на бланке образовательной организации, согласно форме заявки в Положении",
    type: "file",
    required: true,
    templates: [{ label: "бланк заявки (Приложение №1)", url: "/docs/forma-zayavki-priloshenie-1.docx" }],
  },
  {
    name: "supportingDocs",
    label: "Подтверждающие документы, согласно перечню документов в Приложении 2-3 к Положению",
    type: "file",
    required: true,
    templates: [
      { label: "Положение о конкурсе", url: "/docs/polozhenie-poo-oo-2026.pdf" },
      { label: "перечень документов (Приложение)", url: "/docs/prilozhenie-k-polozheniyu-oo.docx" },
    ],
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
