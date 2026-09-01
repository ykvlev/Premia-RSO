import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

/**
 * Разовый скрипт: заводит номинацию «Лидер студенческих отрядов» (для
 * командиров и комиссаров трудовых проектов, Приложение №11) — вторую,
 * отдельную от «Персональная номинация «Лидер РСО»» (Приложение №10,
 * общий вариант с возрастной категорией). Раньше эта номинация была
 * только в prisma/seed.ts, но так и не попала в БД и была недоступна
 * на сайте для подачи заявки.
 */

const TITLE = "«Лидер студенческих отрядов» (командиры и комиссары трудовых проектов)";

const description =
  "Персональная номинация для командиров и комиссаров трудовых проектов — тех, кто берёт на себя ответственность за результат и за людей на месте, руководит работой штаба и лично отвечает за реализацию трудового проекта от начала до конца.";

const criteriaLabels = [
  "Видеопрезентация участника",
  "Эффективность руководства трудовым проектом, личный вклад в развитие студенческих отрядов",
  "Оценка реализованного проекта под руководством участника (отчёт)",
  "Портфолио участника",
];

const formSchema = [
  { name: "fio", label: "Ф.И.О. (полностью)", type: "text", required: true },
  { name: "region", label: "Субъект Российской Федерации", type: "text", required: true },
  { name: "birthDate", label: "Дата рождения", type: "text", required: true },
  { name: "projectRole", label: "Укажите категорию", type: "select", required: true, options: ["Командир трудового проекта", "Комиссар трудового проекта"] },
  { name: "projectName", label: "Название трудового проекта", type: "text", required: true },
  { name: "phone", label: "Контактный телефон", type: "text", required: true },
  { name: "email", label: "Электронная почта", type: "text", required: true },
  { name: "study", label: "Место учёбы / работы", type: "text", required: true },
  { name: "vk", label: "Ссылка на личную страницу в социальной сети «ВКонтакте»", type: "url", required: true },
  { name: "videoUrl", label: "Ссылка на видеопрезентацию в облачном хранилище (видеовизитка до 1 минуты)", type: "url", required: true },
  { name: "staffReport", label: "Отчёт о работе штаба", type: "textarea", required: true },
  { name: "portfolioUrl", label: "Ссылка на портфолио в облачном хранилище", type: "url" },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.nomination.findFirst({ where: { title: TITLE } });
  if (existing) {
    console.log(`= уже есть: ${TITLE} (id ${existing.id}) — ничего не делаю`);
    return;
  }

  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.error("Активный сезон не найден");
    process.exit(1);
  }

  const criteria = criteriaLabels.map((label, i) => ({
    key: `c${i + 1}`,
    label,
    maxScore: 10,
    weight: 1,
    step: 1,
  }));

  const nom = await prisma.nomination.create({
    data: {
      seasonId: season.id,
      title: TITLE,
      description,
      criteria: criteria as object,
      participantType: "Физическое лицо",
      formSchema: formSchema as object,
    },
  });
  console.log(`Создано: ${TITLE} (id ${nom.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
