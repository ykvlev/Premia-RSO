import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
async function main() {
  const noms = await prisma.nomination.findMany();
  const byTitle = (t: string) => noms.find((n) => n.title.includes(t))!;
  const rows = [
    {
      t: "Профессионал",
      fio: "Иванов Иван Иванович",
      region: "Москва",
      status: "review" as const,
      pt: "Физическое лицо",
      pay: {
        nomineeFio: "Иванов Иван Иванович",
        gender: "Мужской",
        birthDate: "2003-05-14",
        workplace: "УрФУ",
        position: "Командир отряда",
        descActivity: "Провёл 24 мероприятия для 800+ участников.",
        descScale: "3 района, 5 публикаций в СМИ.",
        coverageLevel: "Региональный (уровень субъекта РФ)",
        howKnew: "Сайт РСО (trudkrut.ru)",
        nominateSelf: "Себя",
      },
    },
    {
      t: "СМИ",
      fio: "Редакция «Прогресс»",
      region: "Санкт-Петербург",
      status: "new" as const,
      pt: "СМИ",
      pay: {
        nomineeFio: "Редакция «Прогресс»",
        descActivity: "Серия репортажей о студотрядах.",
        descScale: "Охват 250000.",
        coverageLevel: "Федеральный (вся Россия)",
      },
    },
    {
      t: "региональное отделение МОOO",
      fio: "РО Татарстан",
      region: "Республика Татарстан",
      status: "finalist" as const,
      pt: "Региональное отделение",
      pay: {
        nomineeFio: "РО Татарстан",
        descActivity: "Рост движения на 20%.",
        descScale: "28 отрядов, 950 бойцов.",
        coverageLevel: "Региональный (уровень субъекта РФ)",
      },
    },
  ];
  for (const r of rows) {
    const nom = byTitle(r.t);
    const exists = await prisma.application.findFirst({ where: { orgName: r.fio } });
    if (exists) {
      console.log("=", r.fio);
      continue;
    }
    await prisma.application.create({
      data: {
        nominationId: nom.id,
        participantType: r.pt,
        orgName: r.fio,
        inn: "7701234567",
        region: r.region,
        contactFio: r.fio,
        phone: "—",
        email: "—",
        links: "https://vk.com/example",
        payload: r.pay as object,
        status: r.status,
      },
    });
    console.log("+", r.fio, r.status);
  }
  console.log("итого заявок:", await prisma.application.count());
}
main().finally(() => prisma.$disconnect());
