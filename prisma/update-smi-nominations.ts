import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

/**
 * Разовый скрипт: приводит formSchema и criteria трёх номинаций СМИ в
 * соответствие с Положением о премии (Приложения №3–5 — заявка,
 * №15–17 — оценочный лист). До этого formSchema у части номинаций
 * СМИ фактически дублировал текст критериев оценки вместо полей заявки
 * (заявитель видел «Региональная значимость материала» и т.п. вместо
 * «Полное название СМИ», «ФИО автора» и т.д.).
 */

type Field = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
};

const smiFields = (materialLinkLabel: string): Field[] => [
  { name: "smiName", label: "Полное название СМИ", type: "text", required: true },
  { name: "legalEntity", label: "Юридическое лицо", type: "text", required: true },
  { name: "smiRegistration", label: "Сведения о регистрации СМИ", type: "text", required: true },
  { name: "authorFio", label: "Ф.И.О. (полностью) автора/авторов", type: "text", required: true },
  { name: "authorWorkplace", label: "Место работы, должность", type: "text", required: true },
  { name: "authorBirthDate", label: "Дата рождения", type: "text", required: true },
  { name: "authorPhone", label: "Контактный телефон", type: "text", required: true },
  { name: "authorEmail", label: "Электронная почта", type: "text", required: true },
  { name: "workTitle", label: "Название работы", type: "text", required: true },
  { name: "materialLink", label: materialLinkLabel, type: "url", required: true },
];

const UPDATES: {
  title: string;
  description: string;
  criteria: string[];
  formSchema: Field[];
}[] = [
  {
    title: "Мастер слова «Событие года»",
    description:
      "Номинация для тех, кто умеет быть в самом центре событий и превращать происходящее в историю, которую увидит вся страна. Для журналистов, способных передать атмосферу, масштаб и эмоцию всероссийского события РСО так, чтобы у читателя или зрителя возникло ощущение личного присутствия. Здесь важны точность, динамика и собственный авторский взгляд.",
    criteria: ["Динамика и структура", "Эффект присутствия", "Эксклюзивность инфоповода", "Уникальность контента"],
    formSchema: smiFields("Ссылка на сюжет/новость, представляемый для участия в Национальной премии"),
  },
  {
    title: "Мастер слова «Событие РСО в региональном аспекте»",
    description:
      "Номинация для тех, кто умеет увидеть большое в событиях своего региона и показать, как Российские студенческие отряды меняют жизнь конкретных городов и территорий. Для журналистов районных, городских и областных СМИ, которые рассказывают о событии РСО через людей, локальный контекст и значимость для региона — живо, содержательно и с вниманием к тому, что действительно важно для своей аудитории.",
    criteria: ["Значимость для региона", "Информативность и фактаж", "Оперативность выхода", "Социальный резонанс"],
    formSchema: smiFields("Ссылка на сюжет/новость, представляемый для участия в Национальной премии"),
  },
  {
    title: "«Едины делом: Трудовой сезон РСО в объективе»",
    description:
      "Номинация для тех, кто умеет показать трудовой сезон не как набор цифр и фактов, а как живую историю региона. Для представителей СМИ, которые через людей, рабочие будни, масштаб проектов и атмосферу отрядного движения рассказывают, чем живут студенческие отряды в сезон и какой вклад они вносят в развитие нашей страны.",
    criteria: ["Системность и полнота охвата", "Использование статистики", "Наличие проблематики", "Социальный резонанс"],
    formSchema: smiFields("Ссылка на материалы, представляемые для участия в Национальной премии"),
  },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const u of UPDATES) {
    const nom = await prisma.nomination.findFirst({ where: { title: u.title } });
    if (!nom) {
      console.error("Номинация не найдена:", u.title);
      continue;
    }
    const criteria = u.criteria.map((label, i) => ({
      key: `c${i + 1}`,
      label,
      maxScore: 10,
      weight: 1,
      step: 1,
    }));
    await prisma.nomination.update({
      where: { id: nom.id },
      data: {
        description: u.description,
        criteria: criteria as object,
        formSchema: u.formSchema as object,
      },
    });
    console.log(`Обновлено: ${u.title} (id ${nom.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
