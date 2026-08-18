import "dotenv/config";
import { hashSync } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../lib/generated/prisma/client";

/**
 * Сид: активный сезон + 11 номинаций (тексты синхронизированы с лендингом —
 * Figma Make экспорт заказчика; порядок и формулировки как на витрине) +
 * тестовые пользователи всех ролей. Идемпотентен по email/title.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEV_PASSWORD = "TrudKrut2026!";

// Тестовые пользователи (с известным паролем) и назначения жюри создаются
// только в dev. На проде — SEED_DEV_USERS=true, иначе пропускаются.
// Реальных пользователей заводить через `npx tsx prisma/create-users.ts`.
const seedDevUsers =
  process.env.SEED_DEV_USERS === "true" || process.env.NODE_ENV !== "production";

const users: { fio: string; email: string; role: Role }[] = [
  { fio: "Петров Пётр Петрович", email: "participant@test.ru", role: "participant" },
  { fio: "Смирнова Анна Викторовна", email: "jury1@test.ru", role: "jury" },
  { fio: "Кузнецов Дмитрий Сергеевич", email: "jury2@test.ru", role: "jury" },
  { fio: "Орлова Мария Александровна", email: "admin@test.ru", role: "admin" },
  { fio: "Волков Алексей Николаевич", email: "superadmin@test.ru", role: "superadmin" },
];

/**
 * 13 номинаций сезона 2026 (по ТЗ, разделы 1.1–1.4; тексты синхронизированы
 * с лендингом). Критерии оценки — до публикации положения о премии (пусто).
 */
const raw: {
  title: string;
  participantType: string;
  description: string;
  criteria: string[];
}[] = [
  // 1.1 Организации / работодатели
  {
    title: "Лучший работодатель по трудоустройству несовершеннолетней молодёжи (14–18 лет)",
    participantType: "Работодатель",
    description:
      "Номинация для тех, кто видит в подростках не временный кадровый резерв, а будущих специалистов отрасли. В фокусе — работодатели, выстраивающие карьерные треки для ребят 14–18 лет: наставничество, гибкие графики, охрана труда без ущерба для учёбы. Отмечаем тех, для кого труд несовершеннолетних — инструмент ранней профориентации и воспитания ответственности.",
    criteria: [],
  },
  {
    title: "Лучший работодатель по организации безопасных условий труда для молодёжи",
    participantType: "Работодатель",
    description:
      "Номинация для тех, кто ставит безопасность сотрудников на первое место. Для работодателей, которые доказывают на деле: защита жизни и здоровья — лучший способ удержать ценные кадры. Отмечаем организации, где безопасная работа начинается с первого дня трудоустройства.",
    criteria: [],
  },
  {
    title:
      "Лучшая практика организации деятельности студотрядов в образовательной организации высшего образования",
    participantType: "Вуз",
    description:
      "Номинация для тех, кто превращает штаб студенческих отрядов в вузе в современный центр карьеры и личностного роста. Для университетов, доказывающих на практике: студотряды — это не только трудоустройство, но и лучшая школа управленческих навыков и корпоративной культуры будущих специалистов.",
    criteria: [],
  },
  {
    title:
      "Лучшая практика организации деятельности студотрядов в профессиональной и общеобразовательной организации",
    participantType: "Ссуз",
    description:
      "Номинация для тех, кто открывает мир реального труда для школьников и студентов колледжей через движение РСО. Для образовательных организаций, которые превращают студотряды из внеурочной деятельности в первую ступень карьеры — туда, где учебник встречается с настоящей работой на объекте.",
    criteria: [],
  },
  {
    title: "Работа СО смыслом",
    participantType: "Работодатель",
    description:
      "Номинация для партнёров МООО «РСО», НКО, фондов и работодателей, которые видят в движении студотрядов инструмент развития региона и поддержки талантливой молодёжи. Для вас труд — не просто производственная задача, а инвестиция в будущее страны: вы создаёте экосистему, где энергия студентов встречается с реальными социальными вызовами.",
    criteria: [],
  },
  // 1.2 Региональные отделения и участники движения
  {
    title: "Лучший региональный совет ветеранов МООО «РСО»",
    participantType: "Региональное отделение",
    description:
      "Номинация — признание тем, кто превращает историю движения в его будущее. Для региональных советов ветеранов связь поколений — это не дань уважения прошлому, а главный инструмент развития молодёжи. Вы создаёте систему живой памяти, где опыт первопроходцев БАМа и целины становится руководством для бойцов современных всероссийских проектов.",
    criteria: [],
  },
  {
    title: "Специальная номинация «Герой РСО»",
    participantType: "Физическое лицо",
    description:
      "Номинация создана для того, чтобы страна знала своих настоящих героев нашего времени. Здесь награждают не за выслугу лет или должность, а за поступок, ставший нравственным ориентиром для всего движения. Это боец, командир или ветеран, оказавшийся лицом к лицу с чрезвычайной ситуацией — спасением людей или защитой интересов товарищей вопреки обстоятельствам.",
    criteria: [],
  },
  {
    title: "Персональная номинация «Лидер РСО»",
    participantType: "Физическое лицо",
    description:
      "Номинация для тех, кто берёт на себя ответственность за людей и результат в любой ситуации. Для любого члена Российских студенческих отрядов, который доказывает личным примером: лидерство — это не должность в штабной структуре, а готовность первым выйти из зоны комфорта ради общего дела.",
    criteria: [],
  },
  // 1.3 Органы государственной власти субъектов РФ
  {
    title: "Лучший орган исполнительной власти по поддержке и развитию студотрядов",
    participantType: "Орган власти",
    description:
      "Номинация для тех, кто доверяет нам самое ценное — будущее страны. Кто видит в студенческих отрядах не просто молодёжное движение, а надёжную опору, способную решать реальные государственные задачи.",
    criteria: [],
  },
  {
    title: "Лучшая практика поддержки трудовых отрядов подростков",
    participantType: "Орган власти",
    description:
      "Номинация для тех, кто видит в подростках тех, кому завтра продолжать историю страны. Кто даёт им платформу для роста, возможность попробовать себя в настоящей работе, научиться работать в команде и видеть результат своих усилий. Поддержка, которая помогает раскрыть способности, окрепнуть и понять, что их труд приносит пользу.",
    criteria: [],
  },
  // 1.4 Средства массовой информации
  {
    title: "Мастер слова «Событие года»",
    participantType: "СМИ",
    description: "Описание номинации будет опубликовано в положении о премии.",
    criteria: [],
  },
  {
    title: "Мастер слова «Событие РСО в региональном аспекте»",
    participantType: "СМИ",
    description: "Описание номинации будет опубликовано в положении о премии.",
    criteria: [],
  },
  {
    title: "«Едины делом: Трудовой сезон РСО в объективе»",
    participantType: "СМИ",
    description: "Описание номинации будет опубликовано в положении о премии.",
    criteria: [],
  },
];

/**
 * Официальные поля заявки по каждой номинации (приложения к положению премии).
 * Рендерятся динамически на шаге «Данные по номинации» формы подачи.
 */
type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "url" | "file";
  required?: boolean;
  options?: string[];
};

const ORG_HEAD: Field[] = [
  { name: "orgName", label: "Наименование организации", type: "text", required: true },
  { name: "orgAddress", label: "Юридический адрес организации", type: "text", required: true },
  { name: "orgInn", label: "ИНН организации", type: "text", required: true },
  { name: "orgHead", label: "Ф.И.О. руководителя организации", type: "text", required: true },
];

const FIELDS: Record<string, Field[]> = {
  // Приложение №1
  "Лучший работодатель по трудоустройству несовершеннолетней молодёжи (14–18 лет)": [
    ...ORG_HEAD,
    { name: "projectsGeo", label: "Трудовые проекты организации и их география", type: "textarea", required: true },
    { name: "hiredCount", label: "Количество трудоустроенных в текущем календарном году участников трудовых отрядов подростков", type: "number", required: true },
    { name: "medianSalary", label: "Медианная заработная плата в текущем календарном году у бойцов трудовых отрядов подростков (руб.)", type: "number", required: true },
    { name: "socialProjects", label: "Опыт организации социальных проектов, организованных в рамках взаимодействия с трудовыми отрядами подростков", type: "textarea", required: true },
    { name: "uniqueProjects", label: "Уникальные проекты и механика взаимодействия с трудовыми отрядами подростков", type: "textarea", required: true },
  ],
  // Приложение №2
  "Лучший работодатель по организации безопасных условий труда для молодёжи": [
    ...ORG_HEAD,
    { name: "hiredCount", label: "Количество трудоустроенных в текущем календарном году участников студенческих отрядов", type: "number", required: true },
    { name: "otSystem", label: "Система управления охраной труда организации при трудоустройстве участников студенческих отрядов", type: "textarea", required: true },
    { name: "supportMechanism", label: "Механизм сопровождения участников в период трудового проекта", type: "textarea", required: true },
    { name: "injuryPrevention", label: "Механизм профилактики производственного травматизма", type: "textarea", required: true },
    { name: "otResults", label: "Результативность системы охраны труда в качественных и количественных показателях", type: "textarea", required: true },
    { name: "safetyCulture", label: "Мероприятия на производстве для формирования культуры безопасного труда", type: "textarea", required: true },
  ],
  // Приложение №5
  "Работа СО смыслом": [
    ...ORG_HEAD,
    { name: "agreements", label: "Наличие и уровень подписанных соглашений, системность взаимодействия, создание совместной инфраструктуры", type: "textarea", required: true },
    { name: "socialEvents", label: "Количество и описание социально-значимых мероприятий, организованных совместно с МООО «РСО»", type: "textarea", required: true },
    { name: "mentorship", label: "Организованная система наставничества со стороны кадровых сотрудников компании на объектах работы", type: "textarea", required: true },
    { name: "laborProjects", label: "Количество и описание трудовых проектов (всероссийского, окружного, межрегионального уровней) совместно с МООО «РСО» (при наличии)", type: "textarea" },
    { name: "publications", label: "Публикации и упоминания совместной деятельности со студотрядами в СМИ (при наличии — ссылки, сканы, названия изданий)", type: "textarea" },
    { name: "financialSupport", label: "Программы финансовой поддержки (спонсорская помощь, поддержка образовательных программ, благотворительность, материально-техническая помощь)", type: "textarea", required: true },
    { name: "coworkingSpace", label: "Наличие мультиформатного пространства «СО.здание» / коворкинга / штаба на базе инфраструктуры предприятия (при наличии — описать наполнение)", type: "textarea" },
    { name: "portfolioUrl", label: "Ссылка на портфолио в облачном хранилище", type: "url" },
  ],
  // Приложение №6
  "Лучший региональный совет ветеранов МООО «РСО»": [
    { name: "region", label: "Субъект Российской Федерации", type: "text", required: true },
    { name: "councilHead", label: "Ф.И.О. руководителя регионального совета ветеранов", type: "text", required: true },
    { name: "officialDoc", label: "Наличие официального документа, на основании которого осуществляется деятельность", type: "textarea" },
    { name: "officialDocFile", label: "Официальный документ (при наличии — прикрепить)", type: "file" },
    { name: "eventsCount", label: "Количество и описание мероприятий, организованных региональным советом ветеранов в текущем году", type: "textarea", required: true },
    { name: "shockLaborDay", label: "Участие во Всероссийской акции «День ударного труда» по итогам трудового семестра 2026 г.", type: "textarea", required: true },
    { name: "shockLaborDayFile", label: "Подтверждающие документы по акции «День ударного труда»", type: "file", required: true },
    { name: "vetSoviet", label: "Количество ветеранов движения студотрядов советского периода в субъекте РФ", type: "number", required: true },
    { name: "vetModern", label: "Количество ветеранов и выпускников современного движения студотрядов", type: "number", required: true },
    { name: "alumniMechanism", label: "Механизм работы с выпускниками МООО «РСО» в региональном отделении", type: "textarea", required: true },
    { name: "museums", label: "Вклад совета ветеранов в формирование музеев, экспозиций, стендов о студотрядах в субъекте РФ", type: "textarea", required: true },
  ],
  // Приложение №7
  "Лучшая практика поддержки трудовых отрядов подростков": [
    { name: "region", label: "Субъект Российской Федерации", type: "text", required: true },
    { name: "authorityName", label: "Полное наименование органа исполнительной власти", type: "text", required: true },
    { name: "regionalProgram", label: "Наличие региональной программы поддержки ТОП (да/нет, название программы или законодательного акта)", type: "text", required: true },
    { name: "topFunding", label: "Объём финансирования ТОП из бюджета субъекта РФ (руб., за текущий год)", type: "number", required: true },
    { name: "jobsCreated", label: "Количество созданных рабочих мест для подростков (через ТОП)", type: "number", required: true },
    { name: "topCount", label: "Количество трудовых отрядов подростков, осуществляющих деятельность на территории РФ", type: "number", required: true },
    { name: "crossRegionSupport", label: "Оказываемая поддержка при приёме участников ТОП из других субъектов РФ", type: "textarea", required: true },
    { name: "nonMaterialSupport", label: "Меры нематериальной поддержки трудовых отрядов подростков в регионе", type: "textarea", required: true },
    { name: "employerSupport", label: "Меры поддержки работодателям при трудоустройстве и организации летней занятости участников ТОП (субсидии, гранты, налоговые льготы, методпомощь) — до 1000 знаков", type: "textarea", required: true },
  ],
  // Приложение №8
  "Лучший орган исполнительной власти по поддержке и развитию студотрядов": [
    { name: "region", label: "Субъект Российской Федерации", type: "text", required: true },
    { name: "authorityName", label: "Полное наименование органа исполнительной власти", type: "text", required: true },
    { name: "authorityHead", label: "Ф.И.О. руководителя органа исполнительной власти", type: "text", required: true },
    { name: "agreementRso", label: "Наличие действующего соглашения между МООО «РСО» и Правительством региона", type: "select", required: true, options: ["Да", "Нет"] },
    { name: "regionalLaw", label: "Наличие регионального закона о студенческих отрядах", type: "select", required: true, options: ["Да", "Нет"] },
    { name: "soBuilding", label: "Наличие здания студенческих отрядов в регионе", type: "select", required: true, options: ["Да", "Нет"] },
    { name: "topProgram", label: "Наличие программы поддержки трудоустройства трудовых отрядов подростков", type: "select", required: true, options: ["Да", "Нет"] },
    { name: "financialSupport", label: "Программы финансовой поддержки студенческих отрядов в регионе", type: "textarea", required: true },
    { name: "nonMaterialSupport", label: "Меры нематериальной поддержки студенческих отрядов в регионе", type: "textarea", required: true },
  ],
  // Приложение №9/1
  "Персональная номинация «Лидер РСО»": [
    { name: "fio", label: "Ф.И.О. (полностью)", type: "text", required: true },
    { name: "region", label: "Субъект Российской Федерации", type: "text", required: true },
    { name: "birthDate", label: "Дата рождения", type: "text", required: true },
    { name: "ageCategory", label: "Возрастная категория", type: "select", required: true, options: ["14 – 18 лет", "18 – 25 лет", "26 – 35 лет"] },
    { name: "phone", label: "Контактный телефон", type: "text", required: true },
    { name: "email", label: "Электронная почта", type: "text", required: true },
    { name: "study", label: "Место учёбы / работы", type: "text", required: true },
    { name: "vk", label: "Ссылка на личную страницу «ВКонтакте»", type: "url", required: true },
    { name: "videoUrl", label: "Ссылка на видеопрезентацию в облачном хранилище (видеовизитка до 1 минуты)", type: "url", required: true },
    { name: "experience", label: "Опыт работы в движении студенческих отрядов", type: "textarea", required: true },
    { name: "activity", label: "Социальная и профессиональная активность по популяризации и развитию движения студотрядов", type: "textarea", required: true },
    { name: "projects", label: "Проекты, реализованные по вашей инициативе или под вашим руководством, с кратким описанием результатов", type: "textarea", required: true },
    { name: "portfolioUrl", label: "Ссылка на портфолио в облачном хранилище", type: "url" },
  ],
  // Приложение №10
  "Специальная номинация «Герой РСО»": [
    { name: "regionalBranch", label: "Региональное отделение МООО «РСО»", type: "text", required: true },
    { name: "fio", label: "Ф.И.О. (полностью)", type: "text", required: true },
    { name: "region", label: "Субъект Российской Федерации", type: "text", required: true },
    { name: "birthDate", label: "Дата рождения", type: "text", required: true },
    { name: "phone", label: "Контактный телефон", type: "text", required: true },
    { name: "study", label: "Место учёбы / работы", type: "text", required: true },
    { name: "vk", label: "Ссылка на личную страницу «ВКонтакте»", type: "url", required: true },
    { name: "heroStory", label: "История героя", type: "textarea", required: true },
  ],
};

/** Для номинаций без официального приложения — универсальный набор (уточнить по положению). */
const DEFAULT_FIELDS: Field[] = [
  { name: "descActivity", label: "Описание деятельности за 2025–2026 гг.", type: "textarea", required: true },
  { name: "descScale", label: "Масштаб и охват деятельности (количественные показатели)", type: "textarea", required: true },
  { name: "additionalInfo", label: "Дополнительная информация (награды, публикации, достижения)", type: "textarea" },
  { name: "materialUrl", label: "Ссылка на материалы / портфолио в облачном хранилище", type: "url" },
];

const nominations = raw.map((n) => ({
  title: n.title,
  participantType: n.participantType,
  description: n.description,
  criteria: n.criteria.map((label, i) => ({
    key: `c${i + 1}`,
    label,
    maxScore: 10,
    weight: Number((1 / n.criteria.length).toFixed(2)),
  })),
  formSchema: (FIELDS[n.title] ?? DEFAULT_FIELDS) as unknown[],
}));

async function main() {
  let season = await prisma.season.findFirst({ where: { year: 2026 } });
  if (!season) {
    season = await prisma.season.create({
      data: {
        year: 2026,
        startAt: new Date("2026-06-01T00:00:00+03:00"),
        endAt: new Date("2026-10-31T23:59:59+03:00"),
        isActive: true,
        scoringConfig: { formula: "weighted_average" },
      },
    });
    console.log(`+ сезон ${season.year}`);
  } else {
    console.log(`= сезон ${season.year} уже есть`);
  }

  if (seedDevUsers) {
    const passwordHash = hashSync(DEV_PASSWORD, 10);
    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { fio: u.fio, role: u.role },
        create: { ...u, passwordHash },
      });
    }
    console.log(`+ тестовых пользователей: ${users.length}`);
  } else {
    console.log("= тестовые пользователи пропущены (прод; заведи админа через prisma/create-admin.ts)");
  }

  const nominationIds: string[] = [];
  for (const n of nominations) {
    let nom = await prisma.nomination.findFirst({
      where: { seasonId: season.id, title: n.title },
    });
    if (!nom) {
      nom = await prisma.nomination.create({
        data: {
          seasonId: season.id,
          title: n.title,
          description: n.description,
          participantType: n.participantType,
          criteria: n.criteria,
          formSchema: n.formSchema as object,
        },
      });
    } else {
      // Обновляем поля/описание/критерии на существующих (идемпотентно).
      nom = await prisma.nomination.update({
        where: { id: nom.id },
        data: {
          description: n.description,
          participantType: n.participantType,
          criteria: n.criteria,
          formSchema: n.formSchema as object,
        },
      });
    }
    nominationIds.push(nom.id);
  }
  console.log(`+ номинаций: ${nominations.length}`);

  if (seedDevUsers) {
    const jury1 = await prisma.user.findUniqueOrThrow({
      where: { email: "jury1@test.ru" },
    });
    const jury2 = await prisma.user.findUniqueOrThrow({
      where: { email: "jury2@test.ru" },
    });
    const assignments = [
      { juryUserId: jury1.id, nominationId: nominationIds[0] },
      { juryUserId: jury1.id, nominationId: nominationIds[1] },
      { juryUserId: jury2.id, nominationId: nominationIds[2] },
      { juryUserId: jury2.id, nominationId: nominationIds[3] },
    ];
    for (const a of assignments) {
      await prisma.juryAssignment.upsert({
        where: { juryUserId_nominationId: a },
        update: {},
        create: a,
      });
    }
  }

  console.log(
    seedDevUsers
      ? `\nСид завершён. Dev-пароль: ${DEV_PASSWORD}`
      : "\nСид завершён (прод-режим: без тестовых пользователей).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
