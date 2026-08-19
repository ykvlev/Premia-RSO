"use client";
/* Портирован из Figma Make макета админки заказчика (адаптирован под Next.js). */
/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions, react-hooks/static-components */
import { useState, useMemo, useCallback } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  CaretDown,
  CaretUp,
  X,
  FileText,
  Trophy,
  Eye,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Warning,
  ArrowsDownUp,
  SignOut,
  User,
  Buildings,
  Link,
  ChatText,
  CaretRight,
  SealCheck,
  ChartBar,
  Rows,
  GitDiff,
  CheckSquare,
  Square,
  ListChecks,
  ArrowCounterClockwise,
  Star,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  bulkUpdateStatus,
  saveApplication,
  deleteApplication,
} from "@/app/admin/actions";
import { ProtocolPDFButton } from "./protocol-pdf";

// ─── Nominations ──────────────────────────────────────────────────────────────
const NOMINATIONS_LIST = [
  { id: "01", title: "Лучший боец студенческого отряда" },
  { id: "02", title: "Лучшие СМИ о студенческих отрядах" },
  { id: "03", title: "Лучший вуз-партнёр" },
  { id: "04", title: "Лучший ссуз-партнёр" },
  { id: "05", title: "Лучшее региональное отделение РСО" },
  { id: "06", title: "Лучшее содействие органов власти" },
  { id: "07", title: "Наставник года" },
  { id: "08", title: "Лучший работодатель" },
  { id: "09", title: "Лучший социальный партнёр" },
  { id: "10", title: "Лучший проект регионального отделения" },
  { id: "11", title: "Лучший штаб регионального отделения" },
];

// ─── Criteria ─────────────────────────────────────────────────────────────────
const CRITERIA: Record<string, { label: string; max: number }[]> = {
  "01": [
    { label: "Профессиональные достижения", max: 30 },
    { label: "Общественная активность", max: 25 },
    { label: "Медийность", max: 20 },
    { label: "Масштаб деятельности", max: 15 },
    { label: "Качество описания", max: 10 },
  ],
  "02": [
    { label: "Охват аудитории", max: 25 },
    { label: "Качество публикаций", max: 25 },
    { label: "Соответствие тематике", max: 25 },
    { label: "Взаимодействие с РСО", max: 25 },
  ],
  "03": [
    { label: "Количество бойцов", max: 30 },
    { label: "Условия для отрядов", max: 30 },
    { label: "Совместные проекты", max: 40 },
  ],
  "04": [
    { label: "Количество бойцов", max: 30 },
    { label: "Условия для отрядов", max: 30 },
    { label: "Совместные проекты", max: 40 },
  ],
  "05": [
    { label: "Численность отрядов", max: 25 },
    { label: "Проекты и мероприятия", max: 25 },
    { label: "Медиаактивность", max: 25 },
    { label: "Работа с работодателями", max: 25 },
  ],
  "06": [
    { label: "Нормативная поддержка", max: 33 },
    { label: "Финансовая поддержка", max: 33 },
    { label: "Партнёрские программы", max: 34 },
  ],
  "07": [
    { label: "Стаж наставничества", max: 25 },
    { label: "Достижения подопечных", max: 25 },
    { label: "Личный вклад", max: 25 },
    { label: "Признание сообщества", max: 25 },
  ],
  "08": [
    { label: "Условия труда", max: 25 },
    { label: "Трудоустройство бойцов", max: 25 },
    { label: "Социальные гарантии", max: 25 },
    { label: "Перспективы роста", max: 25 },
  ],
  "09": [
    { label: "Масштаб партнёрства", max: 25 },
    { label: "Финансовый вклад", max: 25 },
    { label: "Совместные инициативы", max: 25 },
    { label: "Долгосрочность", max: 25 },
  ],
  "10": [
    { label: "Инновационность", max: 25 },
    { label: "Охват участников", max: 25 },
    { label: "Социальный эффект", max: 25 },
    { label: "Реализуемость", max: 25 },
  ],
  "11": [
    { label: "Организация работы", max: 25 },
    { label: "Численность и активность", max: 25 },
    { label: "Достижения штаба", max: 25 },
    { label: "Развитие кадров", max: 25 },
  ],
};

function makeCriteria(nomId: string) {
  return (CRITERIA[nomId] ?? [{ label: "Общая оценка", max: 100 }]).map((c) => ({
    ...c,
    value: null as number | null,
  }));
}

// ─── Types ────────────────────────────────────────────────────────────────────
type AppStatus =
  | "new"
  | "queued"
  | "review"
  | "revision"
  | "scoring"
  | "approved"
  | "rejected"
  | "winner";
type View = "list" | "detail" | "compare" | "dashboard";

interface ScoreItem {
  label: string;
  max: number;
  value: number | null;
}

interface ActivityEntry {
  ts: string;
  user: string;
  action: string;
}

export interface Application {
  id: string;
  submittedAt: string;
  status: AppStatus;
  expertComment: string;
  internalNote?: string;
  score: number | null;
  scores: ScoreItem[];
  nomination: string;
  nominationTitle: string;
  orgType: string;
  nominateSelf: string;
  howKnew: string;
  consentPersonal: boolean;
  consentTerms: boolean;
  consentNewsletter: boolean;
  nomLastName: string;
  nomFirstName: string;
  nomPatronymic: string;
  nomNoPatronymic: boolean;
  nomGender: string;
  nomBirthDate: string;
  nomRegion: string;
  nomWorkplace: string;
  nomPosition: string;
  descActivity: string;
  descScale: string;
  coverageLevel: string;
  additionalInfo: string;
  links: string[];
  attachments?: Attachment[];
  officialFields?: { label: string; value: string }[];
  history: ActivityEntry[];
}

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  mime: string;
}

const STATUS_META: Record<
  AppStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  new: { label: "Отправлена", color: "#9a9aa4", bg: "#1a1a22", icon: <Clock size={12} /> },
  queued: {
    label: "Ожидает рассмотрения",
    color: "#7a86ff",
    bg: "#0f1030",
    icon: <ListChecks size={12} />,
  },
  review: {
    label: "На рассмотрении",
    color: "#f59e0b",
    bg: "#1c1600",
    icon: <Warning size={12} />,
  },
  revision: {
    label: "Требует доработки",
    color: "#f97316",
    bg: "#1c0e00",
    icon: <ArrowCounterClockwise size={12} />,
  },
  scoring: {
    label: "На оценке жюри",
    color: "#a855f7",
    bg: "#15002a",
    icon: <Star size={12} />,
  },
  approved: {
    label: "Финалист",
    color: "#22c55e",
    bg: "#001a06",
    icon: <CheckCircle size={12} />,
  },
  rejected: {
    label: "Отклонена",
    color: "#ef4444",
    bg: "#1a0000",
    icon: <XCircle size={12} />,
  },
  winner: {
    label: "Победитель",
    color: "#0804ff",
    bg: "#00001a",
    icon: <Trophy size={12} />,
  },
};

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE: Application[] = [
  {
    id: "TK-2026-001",
    submittedAt: "2026-07-10T14:22:00",
    status: "review",
    expertComment: "",
    score: null,
    scores: makeCriteria("01"),
    nomination: "01",
    nominationTitle: "Лучший боец студенческого отряда",
    orgType: "Физическое лицо",
    nominateSelf: "Другого человека",
    howKnew: "Региональное отделение",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: false,
    nomLastName: "Иванова",
    nomFirstName: "Мария",
    nomPatronymic: "Сергеевна",
    nomNoPatronymic: false,
    nomGender: "Женский",
    nomBirthDate: "2003-04-15",
    nomRegion: "Москва",
    nomWorkplace: "7701234567",
    nomPosition: "Командир строительного отряда «Созидатель»",
    descActivity:
      "В 2025–2026 г. организовала 3 выезда строительного отряда. Объём работ — 4,2 млн руб. Провела 18 инструктажей по ТБ. Подготовила 6 новобранцев.",
    descScale:
      "3 муниципальных района МО. 28 бойцов за сезон. Выполнение плана — 140%. 5 публикаций в СМИ.",
    coverageLevel: "Региональный",
    additionalInfo: "Победитель «Лучший командир» РО МСК 2025.",
    links: ["https://vk.com/maria_rso"],
    history: [
      { ts: "2026-07-10T14:22:00", user: "Система", action: "Заявка создана" },
      {
        ts: "2026-07-11T09:00:00",
        user: "Главный администратор",
        action: "Статус → На рассмотрении",
      },
    ],
  },
  {
    id: "TK-2026-002",
    submittedAt: "2026-07-11T09:41:00",
    status: "approved",
    expertComment: "Отличные показатели роста, сильная медиасоставляющая.",
    score: 87,
    scores: [
      { label: "Численность отрядов", max: 25, value: 23 },
      { label: "Проекты и мероприятия", max: 25, value: 22 },
      { label: "Медиаактивность", max: 25, value: 21 },
      { label: "Работа с работодателями", max: 25, value: 21 },
    ],
    nomination: "05",
    nominationTitle: "Лучшее региональное отделение РСО",
    orgType: "Региональное отделение",
    nominateSelf: "Региональное отделение",
    howKnew: "Социальные сети РСО",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: true,
    nomLastName: "Петров",
    nomFirstName: "Алексей",
    nomPatronymic: "Николаевич",
    nomNoPatronymic: false,
    nomGender: "Мужской",
    nomBirthDate: "1990-08-22",
    nomRegion: "Краснодарский край",
    nomWorkplace: "2301098765",
    nomPosition: "Командир РО РСО — Краснодарский край",
    descActivity:
      "РО включает 12 отрядов, 200+ бойцов. 3 федеральных проекта, 15 региональных мероприятий.",
    descScale: "Весь Краснодарский край. Рост численности +18% г/г. 42 материала в СМИ.",
    coverageLevel: "Региональный",
    additionalInfo: "Победитель слёта РСО ЮФО 2025.",
    links: ["https://vk.com/rso_kuban"],
    history: [
      { ts: "2026-07-11T09:41:00", user: "Система", action: "Заявка создана" },
      {
        ts: "2026-07-12T11:20:00",
        user: "Эксперт Комиссии №1",
        action: "Статус → На рассмотрении",
      },
      {
        ts: "2026-07-13T16:05:00",
        user: "Эксперт Комиссии №1",
        action: "Выставлены баллы: 87/100",
      },
      {
        ts: "2026-07-14T09:00:00",
        user: "Главный администратор",
        action: "Статус → Одобрена",
      },
    ],
  },
  {
    id: "TK-2026-003",
    submittedAt: "2026-07-12T16:07:00",
    status: "new",
    expertComment: "",
    score: null,
    scores: makeCriteria("07"),
    nomination: "07",
    nominationTitle: "Наставник года",
    orgType: "Физическое лицо",
    nominateSelf: "Другого человека",
    howKnew: "От руководителя / командира",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: false,
    nomLastName: "Орлова",
    nomFirstName: "Наталья",
    nomPatronymic: "Павловна",
    nomNoPatronymic: false,
    nomGender: "Женский",
    nomBirthDate: "1979-11-03",
    nomRegion: "Республика Татарстан",
    nomWorkplace: "1601234567",
    nomPosition: "Старший наставник, ветеран движения РСО",
    descActivity:
      "15-летний стаж наставничества. 36 индивидуальных сессий. Методика «Первый сезон», внедрена в 12 регионах.",
    descScale:
      "47 из 50 бойцов успешно завершили первый сезон. Спикер на 4 федеральных форумах РСО.",
    coverageLevel: "Федеральный",
    additionalInfo: "Медаль «За верность движению» 2024.",
    links: ["https://vk.com/natalia_rso"],
    history: [{ ts: "2026-07-12T16:07:00", user: "Система", action: "Заявка создана" }],
  },
  {
    id: "TK-2026-004",
    submittedAt: "2026-07-13T11:30:00",
    status: "rejected",
    expertComment:
      "Недостаточно документов о трудоустройстве. Слабая социальная составляющая.",
    score: 31,
    scores: [
      { label: "Условия труда", max: 25, value: 8 },
      { label: "Трудоустройство бойцов", max: 25, value: 9 },
      { label: "Социальные гарантии", max: 25, value: 7 },
      { label: "Перспективы роста", max: 25, value: 7 },
    ],
    nomination: "08",
    nominationTitle: "Лучший работодатель",
    orgType: "Работодатель",
    nominateSelf: "Организацию-работодателя",
    howKnew: "Сайт РСО (trudkrut.ru)",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: false,
    nomLastName: "Козлов",
    nomFirstName: "Дмитрий",
    nomPatronymic: "Вячеславович",
    nomNoPatronymic: false,
    nomGender: "Мужской",
    nomBirthDate: "1982-02-14",
    nomRegion: "Свердловская область",
    nomWorkplace: "7712345678",
    nomPosition: "Генеральный директор ООО «СтройИнвест»",
    descActivity: "Трудоустроили 45 бойцов за 2 сезона. Вводный инструктаж, спецодежда.",
    descScale: "2 объекта в Екатеринбурге. Средняя зарплата бойца — 48 000 руб./мес.",
    coverageLevel: "Региональный",
    additionalInfo: "",
    links: [],
    history: [
      { ts: "2026-07-13T11:30:00", user: "Система", action: "Заявка создана" },
      {
        ts: "2026-07-14T14:00:00",
        user: "Эксперт Комиссии №2",
        action: "Выставлены баллы: 31/100",
      },
      {
        ts: "2026-07-15T10:00:00",
        user: "Главный администратор",
        action: "Статус → Отклонена",
      },
    ],
  },
  {
    id: "TK-2026-005",
    submittedAt: "2026-07-14T08:15:00",
    status: "winner",
    expertComment: "Исключительный кандидат. Единогласно рекомендуем к победе.",
    score: 96,
    scores: [
      { label: "Профессиональные достижения", max: 30, value: 29 },
      { label: "Общественная активность", max: 25, value: 25 },
      { label: "Медийность", max: 20, value: 20 },
      { label: "Масштаб деятельности", max: 15, value: 14 },
      { label: "Качество описания", max: 10, value: 8 },
    ],
    nomination: "01",
    nominationTitle: "Лучший боец студенческого отряда",
    orgType: "Физическое лицо",
    nominateSelf: "Другого человека",
    howKnew: "От коллег или однокурсников",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: true,
    nomLastName: "Зайцев",
    nomFirstName: "Артём",
    nomPatronymic: "Игоревич",
    nomNoPatronymic: false,
    nomGender: "Мужской",
    nomBirthDate: "2001-09-07",
    nomRegion: "Республика Татарстан",
    nomWorkplace: "1655098765",
    nomPosition: "Командир педагогического отряда «Факел»",
    descActivity:
      "Трёхкратный участник ВСО. 6 смен в детлагерях, 35 вожатых. Авторская программа «Мозговой штурм».",
    descScale:
      "6 смен, 35 вожатых, 840 детей, 4 региона. Спикер Всероссийского форума 2025.",
    coverageLevel: "Межрегиональный",
    additionalInfo: "Победитель «Лидер РСО-2025» ПФО.",
    links: ["https://vk.com/artem_zaitsev_rso", "https://t.me/fakel_rso"],
    history: [
      { ts: "2026-07-14T08:15:00", user: "Система", action: "Заявка создана" },
      {
        ts: "2026-07-15T10:00:00",
        user: "Эксперт Комиссии №1",
        action: "Выставлены баллы: 96/100",
      },
      {
        ts: "2026-07-16T09:00:00",
        user: "Главный администратор",
        action: "Статус → Победитель",
      },
    ],
  },
  {
    id: "TK-2026-006",
    submittedAt: "2026-07-15T13:00:00",
    status: "review",
    expertComment: "",
    score: null,
    scores: makeCriteria("01"),
    nomination: "01",
    nominationTitle: "Лучший боец студенческого отряда",
    orgType: "Физическое лицо",
    nominateSelf: "Себя",
    howKnew: "Социальные сети РСО",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: true,
    nomLastName: "Смирнова",
    nomFirstName: "Анна",
    nomPatronymic: "Дмитриевна",
    nomNoPatronymic: false,
    nomGender: "Женский",
    nomBirthDate: "2002-06-20",
    nomRegion: "Санкт-Петербург",
    nomWorkplace: "7800123456",
    nomPosition: "Командир сервисного отряда «Нева»",
    descActivity:
      "2 сезона в сервисных отрядах. Организовала волонтёрский проект в 3 больницах СПб.",
    descScale: "120 волонтёрских часов, 200 благополучателей, 3 медучреждения.",
    coverageLevel: "Региональный",
    additionalInfo: "",
    links: ["https://vk.com/anna_neva_rso"],
    history: [
      { ts: "2026-07-15T13:00:00", user: "Система", action: "Заявка создана" },
      {
        ts: "2026-07-16T08:00:00",
        user: "Главный администратор",
        action: "Статус → На рассмотрении",
      },
    ],
  },
  {
    id: "TK-2026-007",
    submittedAt: "2026-07-16T10:30:00",
    status: "approved",
    expertComment: "Сильное региональное отделение с хорошей динамикой.",
    score: 79,
    scores: [
      { label: "Численность отрядов", max: 25, value: 20 },
      { label: "Проекты и мероприятия", max: 25, value: 20 },
      { label: "Медиаактивность", max: 25, value: 19 },
      { label: "Работа с работодателями", max: 25, value: 20 },
    ],
    nomination: "05",
    nominationTitle: "Лучшее региональное отделение РСО",
    orgType: "Региональное отделение",
    nominateSelf: "Региональное отделение",
    howKnew: "Рассылка по email",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: false,
    nomLastName: "Фёдоров",
    nomFirstName: "Иван",
    nomPatronymic: "Петрович",
    nomNoPatronymic: false,
    nomGender: "Мужской",
    nomBirthDate: "1988-03-11",
    nomRegion: "Новосибирская область",
    nomWorkplace: "5400123456",
    nomPosition: "Командир РО РСО — Новосибирская область",
    descActivity: "РО включает 8 отрядов, 130 бойцов. 2 межрегиональных проекта.",
    descScale: "Новосибирская область. Рост +12% г/г. 28 материалов в СМИ.",
    coverageLevel: "Региональный",
    additionalInfo: "",
    links: [],
    history: [
      { ts: "2026-07-16T10:30:00", user: "Система", action: "Заявка создана" },
      {
        ts: "2026-07-17T11:00:00",
        user: "Эксперт Комиссии №2",
        action: "Выставлены баллы: 79/100",
      },
      {
        ts: "2026-07-17T15:30:00",
        user: "Главный администратор",
        action: "Статус → Одобрена",
      },
    ],
  },
  {
    id: "TK-2026-008",
    submittedAt: "2026-07-17T09:10:00",
    status: "new",
    expertComment: "",
    score: null,
    scores: makeCriteria("10"),
    nomination: "10",
    nominationTitle: "Лучший проект регионального отделения",
    orgType: "Региональное отделение",
    nominateSelf: "Региональное отделение",
    howKnew: "Региональное отделение",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: true,
    nomLastName: "Гусева",
    nomFirstName: "Ольга",
    nomPatronymic: "Ивановна",
    nomNoPatronymic: false,
    nomGender: "Женский",
    nomBirthDate: "1995-07-30",
    nomRegion: "Нижегородская область",
    nomWorkplace: "5200123456",
    nomPosition: "Руководитель проекта «Зелёный лагерь»",
    descActivity:
      "Экоотряды в 4 нацпарках. 300 участников. Посадка 5000 деревьев за сезон.",
    descScale: "4 нацпарка, 300 волонтёров, Нижегородская и Кировская обл.",
    coverageLevel: "Межрегиональный",
    additionalInfo: "Грант Росмолодёжи 2025.",
    links: [],
    history: [{ ts: "2026-07-17T09:10:00", user: "Система", action: "Заявка создана" }],
  },
  {
    id: "TK-2026-009",
    submittedAt: "2026-07-18T14:50:00",
    status: "review",
    expertComment: "",
    score: null,
    scores: makeCriteria("07"),
    nomination: "07",
    nominationTitle: "Наставник года",
    orgType: "Физическое лицо",
    nominateSelf: "Другого человека",
    howKnew: "От руководителя / командира",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: false,
    nomLastName: "Васильев",
    nomFirstName: "Роман",
    nomPatronymic: "Андреевич",
    nomNoPatronymic: false,
    nomGender: "Мужской",
    nomBirthDate: "1985-12-01",
    nomRegion: "Самарская область",
    nomWorkplace: "6300123456",
    nomPosition: "Наставник строительных отрядов, 10 лет стажа",
    descActivity:
      "Подготовил 80+ бойцов. Автор обучающих материалов по технике безопасности.",
    descScale: "ПФО, 5 регионов, 80 выпускников программы наставничества.",
    coverageLevel: "Межрегиональный",
    additionalInfo: "",
    links: [],
    history: [
      { ts: "2026-07-18T14:50:00", user: "Система", action: "Заявка создана" },
      {
        ts: "2026-07-19T08:30:00",
        user: "Эксперт Комиссии №1",
        action: "Статус → На рассмотрении",
      },
    ],
  },
  {
    id: "TK-2026-010",
    submittedAt: "2026-07-19T11:20:00",
    status: "new",
    expertComment: "",
    score: null,
    scores: makeCriteria("05"),
    nomination: "05",
    nominationTitle: "Лучшее региональное отделение РСО",
    orgType: "Региональное отделение",
    nominateSelf: "Региональное отделение",
    howKnew: "Сайт РСО (trudkrut.ru)",
    consentPersonal: true,
    consentTerms: true,
    consentNewsletter: true,
    nomLastName: "Лебедев",
    nomFirstName: "Сергей",
    nomPatronymic: "Михайлович",
    nomNoPatronymic: false,
    nomGender: "Мужской",
    nomBirthDate: "1987-04-22",
    nomRegion: "Ростовская область",
    nomWorkplace: "6100123456",
    nomPosition: "Командир РО РСО — Ростовская область",
    descActivity: "РО: 10 отрядов, 170 бойцов. Рост за год — +25%.",
    descScale: "Ростовская область. 32 публикации в СМИ. 3 межрегиональных проекта.",
    coverageLevel: "Региональный",
    additionalInfo: "",
    links: [],
    history: [{ ts: "2026-07-19T11:20:00", user: "Система", action: "Заявка создана" }],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const F = "var(--font-onest), sans-serif";
const calcTotal = (s: ScoreItem[]) => s.reduce((a, c) => a + (c.value ?? 0), 0);
const calcMax = (s: ScoreItem[]) => s.reduce((a, c) => a + c.max, 0);
const CHART_COLORS = [
  "#0804ff",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
  "#a855f7",
];

function exportCSV(apps: Application[]) {
  const header = [
    "ID",
    "Дата",
    "Статус",
    "Балл",
    "Номинация",
    "Тип",
    "ФИО",
    "Регион",
    "Должность",
    "ИНН",
    "Охват",
    "Комментарий",
  ];
  const rows = apps.map((a) => [
    a.id,
    new Date(a.submittedAt).toLocaleString("ru"),
    STATUS_META[a.status].label,
    a.score ?? "",
    `${a.nomination} — ${a.nominationTitle}`,
    a.orgType,
    `${a.nomLastName} ${a.nomFirstName} ${a.nomPatronymic}`.trim(),
    a.nomRegion,
    a.nomPosition,
    a.nomWorkplace,
    a.coverageLevel,
    a.expertComment,
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trudkrut-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
const labelSt: React.CSSProperties = {
  color: "#6a6a72",
  fontSize: 10,
  fontFamily: F,
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  marginBottom: 6,
};

function StatusBadge({ status }: { status: AppStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        background: m.bg,
        color: m.color,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: F,
        letterSpacing: "0.4px",
        border: `1px solid ${m.color}30`,
        whiteSpace: "nowrap",
      }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function SectionHd({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: 12,
        borderBottom: "1px solid #1e1e28",
        marginBottom: 16,
      }}
    >
      <span style={{ color: "#0804ff" }}>{icon}</span>
      <p
        style={{
          color: "#9a9aa4",
          fontSize: 10,
          fontFamily: F,
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </p>
    </div>
  );
}

function CellCard({
  label,
  value,
  wide,
  mono,
}: {
  label: string;
  value: string;
  wide?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div
      style={{
        background: "#121216",
        border: "1px solid #1e1e28",
        borderRadius: 8,
        padding: "10px 14px",
        gridColumn: wide ? "1 / -1" : undefined,
      }}
    >
      <p style={labelSt}>{label}</p>
      <p
        style={{
          color: "#f2f0ec",
          fontSize: 13,
          fontFamily: mono ? "monospace" : F,
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p style={labelSt}>{label}</p>
      <div
        style={{
          background: "#121216",
          border: "1px solid #1e1e28",
          borderRadius: 8,
          padding: "14px 16px",
        }}
      >
        <p
          style={{
            color: "#f2f0ec",
            fontSize: 13,
            fontFamily: F,
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoBool({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: value ? "#0804ff" : "#1a1a22",
          border: `1px solid ${value ? "#0804ff" : "#2a2a32"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {value && <span style={{ color: "white", fontSize: 10 }}>✓</span>}
      </div>
      <span style={{ color: value ? "#9a9aa4" : "#4a4a56", fontSize: 12, fontFamily: F }}>
        {label}
      </span>
    </div>
  );
}

// ─── Users / Login ────────────────────────────────────────────────────────────
export interface AdminUser {
  username: string;
  password: string;
  displayName: string;
  role: "superadmin" | "expert" | "viewer";
}

const USERS: AdminUser[] = [
  {
    username: "admin",
    password: "TrudKrut2026!",
    displayName: "Главный администратор",
    role: "superadmin",
  },
  {
    username: "expert1",
    password: "Expert#001",
    displayName: "Эксперт Комиссии №1",
    role: "expert",
  },
  {
    username: "expert2",
    password: "Expert#002",
    displayName: "Эксперт Комиссии №2",
    role: "expert",
  },
  {
    username: "viewer",
    password: "View2026",
    displayName: "Наблюдатель",
    role: "viewer",
  },
];

const ROLE_META: Record<AdminUser["role"], { label: string; color: string }> = {
  superadmin: { label: "Суперадмин", color: "#0804ff" },
  expert: { label: "Эксперт", color: "#f59e0b" },
  viewer: { label: "Наблюдатель", color: "#6a6a72" },
};

function LoginScreen({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = USERS.find((u) => u.username === username.trim() && u.password === pass);
    if (u) onLogin(u);
    else {
      setError("Неверный логин или пароль");
      setPass("");
    }
  };

  const inp = (err: boolean): React.CSSProperties => ({
    width: "100%",
    background: "#121216",
    border: `1px solid ${err ? "#ef4444" : "#2a2a32"}`,
    borderRadius: 8,
    color: "#f2f0ec",
    fontSize: 14,
    fontFamily: F,
    padding: "11px 14px",
    outline: "none",
    boxSizing: "border-box",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08080a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: 400,
          padding: 48,
          background: "#0d0d12",
          border: "1px solid #2a2a32",
          borderRadius: 16,
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "#0804ff",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Trophy size={22} color="#f2f0ec" />
          </div>
          <p
            style={{
              color: "#0804ff",
              fontSize: 10,
              fontFamily: F,
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Национальная премия · Труд Крут
          </p>
          <p style={{ color: "#f2f0ec", fontSize: 22, fontFamily: F, fontWeight: 800 }}>
            Вход в панель
          </p>
          <p style={{ color: "#6a6a72", fontSize: 13, fontFamily: F, marginTop: 6 }}>
            Доступ только для авторизованных сотрудников
          </p>
        </div>
        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div>
            <p style={{ ...labelSt, marginBottom: 6 }}>Логин</p>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Введите логин"
              autoComplete="username"
              style={inp(!!error)}
            />
          </div>
          <div>
            <p style={{ ...labelSt, marginBottom: 6 }}>Пароль</p>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError("");
                }}
                placeholder="Введите пароль"
                autoComplete="current-password"
                style={{ ...inp(!!error), paddingRight: 80 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#6a6a72",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: F,
                  padding: 0,
                }}
              >
                {showPass ? "скрыть" : "показать"}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ color: "#ef4444", fontSize: 12, fontFamily: F }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <button
            type="submit"
            style={{
              background: "#0804ff",
              border: "none",
              borderRadius: 8,
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 700,
              padding: "13px",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Войти
          </button>
        </form>
        <div
          style={{
            marginTop: 28,
            padding: "14px 16px",
            background: "#0a0a0f",
            border: "1px solid #1e1e28",
            borderRadius: 8,
          }}
        >
          <p
            style={{
              color: "#4a4a56",
              fontSize: 10,
              fontFamily: F,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Тестовые аккаунты
          </p>
          {USERS.map((u) => (
            <button
              key={u.username}
              type="button"
              onClick={() => {
                setUsername(u.username);
                setPass(u.password);
                setError("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "5px 0",
                borderBottom: "1px solid #131318",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#f2f0ec", fontSize: 12, fontFamily: "monospace" }}>
                  {u.username}
                </span>
                <span style={{ color: "#4a4a56", fontSize: 11, fontFamily: F }}>
                  / {u.password}
                </span>
              </div>
              <span
                style={{
                  color: ROLE_META[u.role].color,
                  fontSize: 10,
                  fontFamily: F,
                  fontWeight: 700,
                }}
              >
                {ROLE_META[u.role].label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────
/** Вложение с превью: картинки и PDF можно раскрыть прямо в карточке. */
function AttachmentItem({ f }: { f: Attachment }) {
  const [open, setOpen] = useState(false);
  const isImg = f.mime.startsWith("image/");
  const isPdf = f.mime === "application/pdf";
  const canPreview = isImg || isPdf;
  const size =
    f.size < 1024 * 1024
      ? `${Math.max(1, Math.round(f.size / 1024))} КБ`
      : `${(f.size / 1048576).toFixed(1)} МБ`;

  return (
    <div style={{ border: "1px solid #1e1e24", borderRadius: 8, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "#0804ff0a",
        }}
      >
        <DownloadSimple size={13} color="#0804ff" />
        <span
          style={{
            color: "#e8e8ec",
            fontSize: 13,
            fontFamily: F,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {f.filename}
        </span>
        <span style={{ color: "#8a8a92", fontSize: 12, flexShrink: 0, fontFamily: F }}>{size}</span>
        {canPreview && (
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              border: "1px solid #2a2a32",
              borderRadius: 6,
              color: "#9a9aa4",
              fontSize: 12,
              fontFamily: F,
              fontWeight: 600,
              padding: "4px 9px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Eye size={12} /> {open ? "Скрыть" : "Просмотр"}
          </button>
        )}
        <a
          href={f.url}
          download={f.filename}
          target="_blank"
          rel="noreferrer"
          title="Скачать"
          style={{ color: "#9a9aa4", display: "flex", flexShrink: 0 }}
        >
          <DownloadSimple size={15} />
        </a>
      </div>
      {open && isImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={f.url}
          alt={f.filename}
          style={{ display: "block", width: "100%", maxHeight: 420, objectFit: "contain", background: "#000" }}
        />
      )}
      {open && isPdf && (
        <iframe
          src={f.url}
          title={f.filename}
          style={{ width: "100%", height: 520, border: 0, background: "#fff", display: "block" }}
        />
      )}
    </div>
  );
}

function DetailView({
  app,
  allIds,
  onBack,
  onSave,
  onDelete,
  onNavigate,
  canEdit,
}: {
  app: Application;
  allIds: string[];
  onBack: () => void;
  onSave: (a: Application) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
  canEdit: boolean;
}) {
  const [local, setLocal] = useState<Application>({
    ...app,
    scores: app.scores.map((s) => ({ ...s })),
  });
  const idx = allIds.indexOf(app.id);
  const prevId = idx > 0 ? allIds[idx - 1] : null;
  const nextId = idx < allIds.length - 1 ? allIds[idx + 1] : null;

  const total = calcTotal(local.scores);
  const max = calcMax(local.scores);
  const nomFull = [
    local.nomLastName,
    local.nomFirstName,
    !local.nomNoPatronymic && local.nomPatronymic,
  ]
    .filter(Boolean)
    .join(" ");

  const setScore = (i: number, raw: string) => {
    const n = raw === "" ? null : Math.max(0, Math.min(local.scores[i].max, Number(raw)));
    setLocal((prev) => {
      const scores = prev.scores.map((s, idx2) => (idx2 === i ? { ...s, value: n } : s));
      return {
        ...prev,
        scores,
        score: scores.some((s) => s.value !== null) ? calcTotal(scores) : null,
      };
    });
  };

  const handleSave = () => onSave(local);

  const SaveBtn = ({ size = "normal" }: { size?: "normal" | "small" }) => (
    <button
      onClick={handleSave}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#0804ff",
        border: "none",
        borderRadius: size === "small" ? 7 : 8,
        color: "#f2f0ec",
        fontSize: size === "small" ? 12 : 13,
        fontFamily: F,
        fontWeight: 700,
        padding: size === "small" ? "6px 14px" : "8px 20px",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <SealCheck size={size === "small" ? 13 : 15} /> Сохранить
    </button>
  );

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      style={{ minHeight: "100vh", background: "#08080a", paddingBottom: 80 }}
    >
      {/* Sticky top bar */}
      <div
        style={{
          background: "#08080a",
          borderBottom: "1px solid #1e1e28",
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            color: "#9a9aa4",
            fontFamily: F,
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f2f0ec")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9a9aa4")}
        >
          <ArrowLeft size={15} /> Назад
        </button>

        {/* Prev / Next nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => prevId && onNavigate(prevId)}
            disabled={!prevId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "1px solid #2a2a32",
              borderRadius: 6,
              color: prevId ? "#9a9aa4" : "#2a2a32",
              fontFamily: F,
              fontSize: 11,
              padding: "5px 10px",
              cursor: prevId ? "pointer" : "default",
            }}
          >
            <ArrowLeft size={11} /> Пред.
          </button>
          <span
            style={{ color: "#4a4a56", fontSize: 11, fontFamily: F, padding: "0 4px" }}
          >
            {idx + 1} / {allIds.length}
          </span>
          <button
            onClick={() => nextId && onNavigate(nextId)}
            disabled={!nextId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "1px solid #2a2a32",
              borderRadius: 6,
              color: nextId ? "#9a9aa4" : "#2a2a32",
              fontFamily: F,
              fontSize: 11,
              padding: "5px 10px",
              cursor: nextId ? "pointer" : "default",
            }}
          >
            След. <ArrowRight size={11} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#4a4a56", fontSize: 11, fontFamily: "monospace" }}>
            {local.id}
          </span>
          <StatusBadge status={local.status} />
          {canEdit && <SaveBtn size="small" />}
        </div>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 40px",
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div>
            <SectionHd icon={<Trophy size={15} />} title="Номинация" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <CellCard
                label="Номинация"
                value={`${local.nomination} — ${local.nominationTitle}`}
                wide
              />
              <CellCard label="Тип организации" value={local.orgType} />
            </div>
          </div>

          <div>
            <SectionHd icon={<User size={15} />} title="Заявитель" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <CellCard label="Кого номинирует" value={local.nominateSelf} />
              <CellCard label="Откуда узнали о премии" value={local.howKnew} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <InfoBool
                label="Согласие на обработку персональных данных"
                value={local.consentPersonal}
              />
              <InfoBool
                label="Принимает условия Положения и Пользовательского соглашения"
                value={local.consentTerms}
              />
              <InfoBool
                label="Согласен на получение информационной рассылки"
                value={local.consentNewsletter}
              />
            </div>
          </div>

          {local.officialFields && local.officialFields.length > 0 && (
            <div>
              <SectionHd icon={<FileText size={15} />} title="Данные по номинации" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {local.officialFields.map((f, i) => (
                  <TextBlock key={i} label={f.label} value={f.value} />
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionHd icon={<User size={15} />} title="Информация о номинанте" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <CellCard label="ФИО" value={nomFull} wide />
              <CellCard label="Пол" value={local.nomGender} />
              <CellCard
                label="Дата рождения"
                value={
                  local.nomBirthDate
                    ? new Date(local.nomBirthDate).toLocaleDateString("ru")
                    : ""
                }
              />
              <CellCard label="Регион проживания" value={local.nomRegion} />
            </div>
            {local.nomNoPatronymic && (
              <p style={{ color: "#6a6a72", fontSize: 11, fontFamily: F, marginTop: 6 }}>
                * Отчество отсутствует
              </p>
            )}
          </div>

          <div>
            <SectionHd icon={<Buildings size={15} />} title="Место работы" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <CellCard label="ИНН организации" value={local.nomWorkplace} mono />
              <CellCard label="Должность" value={local.nomPosition} />
            </div>
          </div>

          <div>
            <SectionHd icon={<FileText size={15} />} title="Описание деятельности" />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <TextBlock
                label="Описание деятельности за 2025–2026 гг."
                value={local.descActivity}
              />
              <TextBlock label="Масштаб и охват деятельности" value={local.descScale} />
              <CellCard label="Уровень охвата" value={local.coverageLevel} />
              {local.additionalInfo && (
                <TextBlock
                  label="Дополнительная информация"
                  value={local.additionalInfo}
                />
              )}
            </div>
          </div>

          {local.links.length > 0 && (
            <div>
              <SectionHd icon={<Link size={15} />} title="Ссылки" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {local.links.map((l, i) => (
                  <a
                    key={i}
                    href={l}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#0804ff",
                      fontSize: 13,
                      fontFamily: F,
                      textDecoration: "none",
                      padding: "7px 12px",
                      background: "#0804ff0a",
                      borderRadius: 6,
                    }}
                  >
                    <CaretRight size={11} /> {l}
                  </a>
                ))}
              </div>
            </div>
          )}

          {local.attachments && local.attachments.length > 0 && (
            <div>
              <SectionHd icon={<DownloadSimple size={15} />} title="Вложения" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {local.attachments.map((f, i) => (
                  <AttachmentItem key={i} f={f} />
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <SectionHd icon={<Clock size={15} />} title="История изменений" />
            <div style={{ position: "relative", paddingLeft: 20 }}>
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "#1e1e28",
                }}
              />
              {local.history.map((h, i) => (
                <div key={i} style={{ position: "relative", paddingBottom: 16 }}>
                  <div
                    style={{
                      position: "absolute",
                      left: -16,
                      top: 4,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: i === 0 ? "#0804ff" : "#2a2a32",
                      border: i === 0 ? "none" : "1px solid #3a3a46",
                    }}
                  />
                  <p
                    style={{
                      color: "#f2f0ec",
                      fontSize: 12,
                      fontFamily: F,
                      fontWeight: 500,
                    }}
                  >
                    {h.action}
                  </p>
                  <p
                    style={{
                      color: "#4a4a56",
                      fontSize: 11,
                      fontFamily: F,
                      marginTop: 2,
                    }}
                  >
                    {fmtDate(h.ts)} · {h.user}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            position: "sticky",
            top: 72,
          }}
        >
          {/* Status */}
          <div
            style={{
              background: "#0d0d12",
              border: "1px solid #1e1e28",
              borderRadius: 12,
              padding: "20px 20px",
            }}
          >
            <p style={{ ...labelSt, marginBottom: 14 }}>Статус заявки</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(Object.keys(STATUS_META) as AppStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => canEdit && setLocal((p) => ({ ...p, status: s }))}
                  disabled={!canEdit}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${local.status === s ? STATUS_META[s].color : "#1e1e28"}`,
                    background: local.status === s ? STATUS_META[s].bg : "transparent",
                    cursor: canEdit ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ color: STATUS_META[s].color }}>
                    {STATUS_META[s].icon}
                  </span>
                  <span
                    style={{
                      color: local.status === s ? STATUS_META[s].color : "#6a6a72",
                      fontSize: 12,
                      fontFamily: F,
                      fontWeight: 600,
                    }}
                  >
                    {STATUS_META[s].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Scoring */}
          <div
            style={{
              background: "#0d0d12",
              border: "1px solid #1e1e28",
              borderRadius: 12,
              padding: "20px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <p style={labelSt}>Оценка</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: F,
                    color:
                      total / max >= 0.8
                        ? "#22c55e"
                        : total / max >= 0.5
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {total}
                </span>
                <span style={{ color: "#4a4a56", fontSize: 12, fontFamily: F }}>
                  /{max}
                </span>
              </div>
            </div>
            <div
              style={{
                height: 4,
                background: "#1e1e28",
                borderRadius: 2,
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(total / max) * 100}%`,
                  height: "100%",
                  background:
                    total / max >= 0.8
                      ? "#22c55e"
                      : total / max >= 0.5
                        ? "#f59e0b"
                        : "#ef4444",
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {local.scores.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <p
                    style={{
                      flex: 1,
                      color: "#9a9aa4",
                      fontSize: 11,
                      fontFamily: F,
                      lineHeight: 1.3,
                    }}
                  >
                    {s.label}
                  </p>
                  <span style={{ color: "#4a4a56", fontSize: 10, fontFamily: F }}>
                    /{s.max}
                  </span>
                  <input
                    type="number"
                    value={s.value ?? ""}
                    min={0}
                    max={s.max}
                    placeholder="—"
                    disabled={!canEdit}
                    onChange={(e) => setScore(i, e.target.value)}
                    style={{
                      width: 52,
                      background: "#121216",
                      border: `1px solid ${s.value !== null ? "#0804ff44" : "#2a2a32"}`,
                      borderRadius: 6,
                      color: "#f2f0ec",
                      fontSize: 14,
                      fontFamily: F,
                      fontWeight: 700,
                      padding: "5px 6px",
                      textAlign: "center",
                      outline: "none",
                      opacity: canEdit ? 1 : 0.6,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div
            style={{
              background: "#0d0d12",
              border: "1px solid #1e1e28",
              borderRadius: 12,
              padding: "20px 20px",
            }}
          >
            <SectionHd icon={<ChatText size={14} />} title="Комментарий эксперта" />
            <textarea
              value={local.expertComment}
              readOnly={!canEdit}
              rows={5}
              onChange={(e) =>
                canEdit && setLocal((p) => ({ ...p, expertComment: e.target.value }))
              }
              placeholder={canEdit ? "Обоснование оценки..." : "Нет комментария"}
              style={{
                width: "100%",
                background: "#121216",
                border: "1px solid #1e1e28",
                borderRadius: 8,
                color: "#f2f0ec",
                fontSize: 13,
                fontFamily: F,
                padding: "12px 14px",
                outline: "none",
                resize: canEdit ? "vertical" : "none",
                lineHeight: 1.65,
                boxSizing: "border-box",
                opacity: canEdit ? 1 : 0.7,
              }}
            />
            <p style={{ color: "#4a4a56", fontSize: 11, fontFamily: F, margin: "6px 0 0" }}>
              Виден заявителю — отправляется письмом при сохранении.
            </p>
          </div>

          <div
            style={{
              background: "#0d0d12",
              border: "1px solid #2a2a32",
              borderRadius: 12,
              padding: "20px 22px",
            }}
          >
            <SectionHd icon={<FileText size={14} />} title="Внутренняя заметка" />
            <textarea
              value={local.internalNote ?? ""}
              readOnly={!canEdit}
              rows={3}
              onChange={(e) =>
                canEdit && setLocal((p) => ({ ...p, internalNote: e.target.value }))
              }
              placeholder={canEdit ? "Заметка для команды (заявитель не видит)..." : "Нет заметки"}
              style={{
                width: "100%",
                background: "#1a1400",
                border: "1px solid #3a3410",
                borderRadius: 8,
                color: "#f0e2b0",
                fontSize: 13,
                fontFamily: F,
                padding: "12px 14px",
                outline: "none",
                resize: canEdit ? "vertical" : "none",
                lineHeight: 1.65,
                boxSizing: "border-box",
                opacity: canEdit ? 1 : 0.7,
              }}
            />
            <p style={{ color: "#7a6a2a", fontSize: 11, fontFamily: F, margin: "6px 0 0" }}>
              Только для оргкомитета — заявителю НЕ видна и по почте НЕ уходит.
            </p>
          </div>

          <ProtocolPDFButton app={local} />

          {canEdit && (
            <button
              onClick={handleSave}
              style={{
                background: "#0804ff",
                border: "none",
                borderRadius: 10,
                color: "#f2f0ec",
                fontSize: 14,
                fontFamily: F,
                fontWeight: 700,
                padding: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <SealCheck size={16} /> Сохранить и выйти
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Удалить заявку безвозвратно? Это действие нельзя отменить.",
                  )
                )
                  onDelete(local.id);
              }}
              style={{
                background: "transparent",
                border: "1px solid #4a2530",
                borderRadius: 10,
                color: "#ff6b6b",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 600,
                padding: "11px",
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              Удалить заявку
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Compare view ─────────────────────────────────────────────────────────────
function CompareView({
  apps,
  onOpen,
}: {
  apps: Application[];
  onOpen: (id: string) => void;
}) {
  const [nomFilter, setNomFilter] = useState("01");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const criteria = CRITERIA[nomFilter] ?? [];
  const maxTotal = criteria.reduce((s, c) => s + c.max, 0);

  const list = useMemo(() => {
    const filtered = apps.filter((a) => a.nomination === nomFilter);
    return [...filtered].sort((a, b) => {
      const av = a.score ?? -1,
        bv = b.score ?? -1;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [apps, nomFilter, sortDir]);

  const topScore = list.find((a) => a.score !== null)?.score ?? null;

  return (
    <motion.div
      key="compare"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ maxWidth: 1440, margin: "0 auto", padding: "36px 32px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <p style={{ color: "#f2f0ec", fontSize: 22, fontFamily: F, fontWeight: 800 }}>
            Сравнение заявок
          </p>
          <p style={{ color: "#6a6a72", fontSize: 13, fontFamily: F, marginTop: 4 }}>
            {list.length} участников · макс. {maxTotal} баллов
          </p>
        </div>
        <select
          value={nomFilter}
          onChange={(e) => setNomFilter(e.target.value)}
          style={{
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 8,
            color: "#f2f0ec",
            fontSize: 13,
            fontFamily: F,
            padding: "9px 14px",
            outline: "none",
            minWidth: 300,
          }}
        >
          {NOMINATIONS_LIST.map((n) => (
            <option key={n.id} value={n.id}>
              {n.id} — {n.title}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "#4a4a56",
            fontSize: 14,
            fontFamily: F,
          }}
        >
          Нет заявок по этой номинации
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2a2a32" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 16px",
                    color: "#4a4a56",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    minWidth: 220,
                  }}
                >
                  # Участник
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    color: "#4a4a56",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Статус
                </th>
                {criteria.map((c, i) => (
                  <th
                    key={`crit-${i}`}
                    style={{
                      textAlign: "center",
                      padding: "10px 12px",
                      color: "#4a4a56",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      minWidth: 110,
                    }}
                  >
                    {c.label}
                    <br />
                    <span style={{ color: "#3a3a46", fontWeight: 400 }}>/{c.max}</span>
                  </th>
                ))}
                <th
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  style={{
                    textAlign: "center",
                    padding: "10px 16px",
                    color: "#9a9aa4",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Итого /{maxTotal}{" "}
                  {sortDir === "desc" ? (
                    <CaretDown size={10} weight="bold" />
                  ) : (
                    <CaretUp size={10} weight="bold" />
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((app, rank) => {
                const total = calcTotal(app.scores);
                const pct = app.score !== null ? total / maxTotal : 0;
                const isWinner = app.status === "winner";
                const isLeader = app.score !== null && app.score === topScore;
                return (
                  <tr
                    key={app.id}
                    onClick={() => onOpen(app.id)}
                    style={{
                      borderBottom: "1px solid #131318",
                      cursor: "pointer",
                      background: isLeader
                        ? "#0804ff0d"
                        : isWinner
                          ? "#0804ff06"
                          : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#141418")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = isLeader
                        ? "#0804ff0d"
                        : isWinner
                          ? "#0804ff06"
                          : "transparent")
                    }
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: isLeader ? "#0804ff" : "#1a1a22",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isLeader ? (
                            <Star size={13} color="#f2f0ec" weight="fill" />
                          ) : (
                            <span
                              style={{ color: "#6a6a72", fontSize: 11, fontWeight: 700 }}
                            >
                              {rank + 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <p
                            style={{
                              color: isLeader ? "#f2f0ec" : "#d0cfc9",
                              fontSize: 13,
                              fontWeight: isLeader ? 700 : 500,
                            }}
                          >
                            {app.nomLastName} {app.nomFirstName}
                          </p>
                          <p style={{ color: "#6a6a72", fontSize: 11, marginTop: 1 }}>
                            {app.nomRegion}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      <StatusBadge status={app.status} />
                    </td>
                    {app.scores.map((s, i) => {
                      const spct = s.value !== null ? s.value / s.max : null;
                      return (
                        <td
                          key={`score-${i}`}
                          style={{ textAlign: "center", padding: "14px 12px" }}
                        >
                          {s.value !== null ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <span
                                style={{
                                  color:
                                    spct! >= 0.8
                                      ? "#22c55e"
                                      : spct! >= 0.5
                                        ? "#f59e0b"
                                        : "#ef4444",
                                  fontWeight: 700,
                                  fontSize: 14,
                                }}
                              >
                                {s.value}
                              </span>
                              <div
                                style={{
                                  width: 36,
                                  height: 2,
                                  background: "#1e1e28",
                                  borderRadius: 1,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${spct! * 100}%`,
                                    height: "100%",
                                    background:
                                      spct! >= 0.8
                                        ? "#22c55e"
                                        : spct! >= 0.5
                                          ? "#f59e0b"
                                          : "#ef4444",
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#2a2a32" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: "center", padding: "14px 16px" }}>
                      {app.score !== null ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              color:
                                pct >= 0.8
                                  ? "#22c55e"
                                  : pct >= 0.5
                                    ? "#f59e0b"
                                    : "#ef4444",
                              fontWeight: 800,
                              fontSize: 18,
                            }}
                          >
                            {total}
                          </span>
                          <div
                            style={{
                              width: 52,
                              height: 3,
                              background: "#1e1e28",
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct * 100}%`,
                                height: "100%",
                                background:
                                  pct >= 0.8
                                    ? "#22c55e"
                                    : pct >= 0.5
                                      ? "#f59e0b"
                                      : "#ef4444",
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <span style={{ color: "#4a4a56", fontSize: 10, fontFamily: F }}>
                            {Math.round(pct * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "#2a2a32" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ─── Dashboard view ───────────────────────────────────────────────────────────
type PeriodFilter = "all" | "week" | "month";

function DashboardView({ apps }: { apps: Application[] }) {
  const [period, setPeriod] = useState<PeriodFilter>("all");

  const filteredApps = useMemo(() => {
    if (period === "all") return apps;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (period === "week" ? 7 : 30));
    return apps.filter((a) => new Date(a.submittedAt) >= cutoff);
  }, [apps, period]);

  const byNom = useMemo(
    () =>
      NOMINATIONS_LIST.map((n) => ({
        name: n.id,
        label: n.title,
        count: filteredApps.filter((a) => a.nomination === n.id).length,
      })).filter((d) => d.count > 0),
    [filteredApps],
  );

  const byStatus = useMemo(
    () =>
      (Object.keys(STATUS_META) as AppStatus[])
        .map((s) => ({
          name: STATUS_META[s].label,
          value: filteredApps.filter((a) => a.status === s).length,
          color: STATUS_META[s].color,
        }))
        .filter((d) => d.value > 0),
    [filteredApps],
  );

  const byRegion = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApps.forEach((a) => {
      map[a.nomRegion] = (map[a.nomRegion] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([r, c]) => ({ name: r, count: c }));
  }, [filteredApps]);

  // Динамика подачи заявок по дням (для графика).
  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApps.forEach((a) => {
      const d = new Date(a.submittedAt);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({
        name: day.slice(8, 10) + "." + day.slice(5, 7),
        count,
      }));
  }, [filteredApps]);

  const scored = filteredApps.filter((a) => a.score !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length)
    : 0;

  // All history events sorted newest first
  const allActivity = useMemo(() => {
    const events: (ActivityEntry & { appId: string; nomFull: string })[] = [];
    apps.forEach((a) => {
      a.history.forEach((h) => {
        events.push({ ...h, appId: a.id, nomFull: `${a.nomLastName} ${a.nomFirstName}` });
      });
    });
    return events.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 12);
  }, [apps]);

  const statCards = [
    { label: "Всего заявок", value: filteredApps.length, color: "#f2f0ec" },
    { label: "Оценено", value: scored.length, color: "#22c55e" },
    { label: "Средний балл", value: avgScore || "—", color: "#0804ff" },
    {
      label: "Победители",
      value: filteredApps.filter((a) => a.status === "winner").length,
      color: "#f59e0b",
    },
  ];

  const periods: { key: PeriodFilter; label: string }[] = [
    { key: "all", label: "Всё время" },
    { key: "month", label: "30 дней" },
    { key: "week", label: "7 дней" },
  ];

  return (
    <motion.div
      key="dash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ maxWidth: 1440, margin: "0 auto", padding: "36px 32px" }}
    >
      {/* Header with period filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <p style={{ color: "#f2f0ec", fontSize: 22, fontFamily: F, fontWeight: 800 }}>
            Дашборд
          </p>
          <p style={{ color: "#6a6a72", fontSize: 13, fontFamily: F, marginTop: 4 }}>
            Статистика по всем заявкам
          </p>
        </div>
        <div
          style={{
            display: "flex",
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                background: period === p.key ? "#1e1e28" : "transparent",
                border: "none",
                borderRadius: 6,
                color: period === p.key ? "#f2f0ec" : "#6a6a72",
                fontFamily: F,
                fontSize: 12,
                fontWeight: period === p.key ? 600 : 400,
                padding: "6px 14px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              background: "#0d0d12",
              border: "1px solid #2a2a32",
              borderRadius: 12,
              padding: "22px 22px",
            }}
          >
            <p
              style={{
                color: "#4a4a56",
                fontSize: 10,
                fontFamily: F,
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                color: s.color,
                fontSize: 34,
                fontFamily: F,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 12,
            padding: "24px",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Заявки по номинациям
          </p>
          {byNom.length === 0 ? (
            <p
              style={{
                color: "#4a4a56",
                fontSize: 13,
                fontFamily: F,
                textAlign: "center",
                paddingTop: 60,
              }}
            >
              Нет данных за период
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byNom} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6a6a72", fontSize: 11, fontFamily: F }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6a6a72", fontSize: 11, fontFamily: F }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121216",
                    border: "1px solid #2a2a32",
                    borderRadius: 8,
                    fontFamily: F,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#f2f0ec" }}
                  itemStyle={{ color: "#9a9aa4" }}
                  formatter={(v, _n, item) => [
                    Number(v),
                    (item as { payload?: { label?: string } }).payload?.label ?? "",
                  ]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byNom.map((d, i) => (
                    <Cell
                      key={`nom-${d.name}`}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          style={{
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 12,
            padding: "24px",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Динамика подачи по дням
          </p>
          {byDay.length === 0 ? (
            <p
              style={{
                color: "#4a4a56",
                fontSize: 13,
                fontFamily: F,
                textAlign: "center",
                paddingTop: 60,
              }}
            >
              Нет данных за период
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={byDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSubmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0804ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0804ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6a6a72", fontSize: 11, fontFamily: F }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6a6a72", fontSize: 11, fontFamily: F }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121216",
                    border: "1px solid #2a2a32",
                    borderRadius: 8,
                    fontFamily: F,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#f2f0ec" }}
                  itemStyle={{ color: "#9a9aa4" }}
                  formatter={(v) => [Number(v), "Заявок"]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0804ff"
                  strokeWidth={2}
                  fill="url(#gradSubmissions)"
                  dot={{ fill: "#0804ff", strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: "#0804ff", strokeWidth: 2, stroke: "#fff", r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          style={{
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 12,
            padding: "24px",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Статусы заявок
          </p>
          {byStatus.length === 0 ? (
            <p
              style={{
                color: "#4a4a56",
                fontSize: 13,
                fontFamily: F,
                textAlign: "center",
                paddingTop: 60,
              }}
            >
              Нет данных за период
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={44}
                  paddingAngle={3}
                >
                  {byStatus.map((s) => (
                    <Cell key={`status-${s.name}`} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#121216",
                    border: "1px solid #2a2a32",
                    borderRadius: 8,
                    fontFamily: F,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "#9a9aa4" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontFamily: F, fontSize: 12, color: "#9a9aa4" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row: region chart + activity feed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
        <div
          style={{
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 12,
            padding: "24px",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Топ регионов
          </p>
          {byRegion.length === 0 ? (
            <p
              style={{
                color: "#4a4a56",
                fontSize: 13,
                fontFamily: F,
                textAlign: "center",
                paddingTop: 40,
              }}
            >
              Нет данных за период
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={byRegion}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: "#6a6a72", fontSize: 11, fontFamily: F }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#9a9aa4", fontSize: 11, fontFamily: F }}
                  axisLine={false}
                  tickLine={false}
                  width={160}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121216",
                    border: "1px solid #2a2a32",
                    borderRadius: 8,
                    fontFamily: F,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "#9a9aa4" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byRegion.map((d, i) => (
                    <Cell
                      key={`region-${d.name}`}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity feed */}
        <div
          style={{
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 12,
            padding: "24px",
            overflow: "hidden",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Последние действия
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              overflowY: "auto",
              maxHeight: 210,
            }}
          >
            {allActivity.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid #131318",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#1a1a22",
                    border: "1px solid #2a2a32",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <span style={{ color: "#6a6a72", fontSize: 10, fontWeight: 700 }}>
                    {h.user.charAt(0)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: "#f2f0ec",
                      fontSize: 12,
                      fontFamily: F,
                      fontWeight: 500,
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h.nomFull} <span style={{ color: "#4a4a56" }}>·</span>{" "}
                    <span style={{ color: "#6a6a72", fontWeight: 400 }}>{h.appId}</span>
                  </p>
                  <p style={{ color: "#9a9aa4", fontSize: 11, fontFamily: F }}>
                    {h.action}
                  </p>
                  <p
                    style={{
                      color: "#3a3a46",
                      fontSize: 10,
                      fontFamily: F,
                      marginTop: 2,
                    }}
                  >
                    {fmtDate(h.ts)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50];

function ListView({
  apps,
  onOpen,
  onBulkUpdate,
  canEdit,
}: {
  apps: Application[];
  onOpen: (id: string) => void;
  onBulkUpdate: (ids: string[], status: AppStatus) => void;
  canEdit: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterNom, setFilterNom] = useState("all");
  const [filterStatus, setFilterStatus] = useState<AppStatus | "all">("all");
  const [sortKey, setSortKey] = useState<"submittedAt" | "score" | "id">("submittedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bulkStatus, setBulkStatus] = useState<AppStatus>("review");
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const filtered = useMemo(() => {
    let list = [...apps];
    const q = search.toLowerCase();
    if (q)
      list = list.filter(
        (a) =>
          `${a.nomLastName} ${a.nomFirstName} ${a.nomPatronymic}`
            .toLowerCase()
            .includes(q) ||
          a.nomWorkplace.includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.nomRegion.toLowerCase().includes(q) ||
          a.nominationTitle.toLowerCase().includes(q),
      );
    if (filterNom !== "all") list = list.filter((a) => a.nomination === filterNom);
    if (filterStatus !== "all") list = list.filter((a) => a.status === filterStatus);
    list.sort((a, b) => {
      const av =
        sortKey === "score"
          ? (a.score ?? -1)
          : sortKey === "submittedAt"
            ? a.submittedAt
            : a.id;
      const bv =
        sortKey === "score"
          ? (b.score ?? -1)
          : sortKey === "submittedAt"
            ? b.submittedAt
            : b.id;
      return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
    });
    return list;
  }, [apps, search, filterNom, filterStatus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

  const togglePage = useCallback(() => {
    const pageIds = new Set(paginated.map((a) => a.id));
    const allSelected = paginated.every((a) => selected.has(a.id));
    if (allSelected)
      setSelected((prev) => {
        const s = new Set(prev);
        pageIds.forEach((id) => s.delete(id));
        return s;
      });
    else
      setSelected((prev) => {
        const s = new Set(prev);
        pageIds.forEach((id) => s.add(id));
        return s;
      });
  }, [paginated, selected]);

  const allPageSelected =
    paginated.length > 0 && paginated.every((a) => selected.has(a.id));

  const applyBulk = (action: "status" | "export") => {
    const ids = [...selected];
    if (action === "status") {
      onBulkUpdate(ids, bulkStatus);
      setSelected(new Set());
    } else {
      exportCSV(apps.filter((a) => ids.includes(a.id)));
    }
    setShowBulkMenu(false);
  };

  const SortIcon = ({ field: k }: { field: typeof sortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <CaretUp size={10} weight="bold" />
      ) : (
        <CaretDown size={10} weight="bold" />
      )
    ) : (
      <ArrowsDownUp size={10} style={{ opacity: 0.3 }} />
    );

  return (
    <motion.div
      key="list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ maxWidth: 1440, margin: "0 auto", padding: "36px 32px" }}
    >
      {/* KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          { lb: "Всего заявок", vl: apps.length, sub: "в сезоне", acc: true },
          { lb: "Новых", vl: apps.filter((a) => a.status === "new").length, sub: "требуют разбора" },
          { lb: "На оценке жюри", vl: apps.filter((a) => a.status === "scoring").length, sub: "у экспертов" },
          { lb: "Победителей", vl: apps.filter((a) => a.status === "winner").length, sub: "определены" },
        ].map((k) => (
          <div
            key={k.lb}
            style={{
              background: "#0d0d11",
              border: "1px solid #1d1d25",
              borderRadius: 13,
              padding: "15px 17px",
            }}
          >
            <p style={{ fontSize: 11.5, color: "#9a9aa4", fontWeight: 600, margin: 0, fontFamily: F }}>
              {k.lb}
            </p>
            <p
              style={{
                fontSize: 30,
                fontWeight: 800,
                margin: "9px 0 0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                letterSpacing: "-1px",
                color: k.acc ? "#93a4ff" : "#f2f0ec",
              }}
            >
              {k.vl}
            </p>
            <p style={{ fontSize: 11, color: "#5c5c66", margin: "3px 0 0", fontFamily: F }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <MagnifyingGlass
            size={14}
            style={{
              position: "absolute",
              left: 13,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#4a4a56",
            }}
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по имени, ИНН, региону, ID, номинации..."
            style={{
              width: "100%",
              background: "#0d0d12",
              border: "1px solid #2a2a32",
              borderRadius: 8,
              color: "#f2f0ec",
              fontSize: 13,
              fontFamily: F,
              padding: "9px 13px 9px 38px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: showFilters ? "#0804ff" : "#0d0d12",
            border: `1px solid ${showFilters ? "#0804ff" : "#2a2a32"}`,
            borderRadius: 8,
            color: showFilters ? "#f2f0ec" : "#9a9aa4",
            fontSize: 13,
            fontFamily: F,
            fontWeight: 600,
            padding: "9px 16px",
            cursor: "pointer",
          }}
        >
          <Funnel size={13} /> Фильтры
        </button>
        <button
          onClick={() => exportCSV(filtered)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#0d0d12",
            border: "1px solid #2a2a32",
            borderRadius: 8,
            color: "#9a9aa4",
            fontSize: 13,
            fontFamily: F,
            fontWeight: 600,
            padding: "9px 16px",
            cursor: "pointer",
          }}
        >
          <DownloadSimple size={13} /> {filtered.length}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 12 }}
          >
            <div
              style={{
                background: "#0d0d12",
                border: "1px solid #2a2a32",
                borderRadius: 10,
                padding: "18px 22px",
                display: "flex",
                gap: 16,
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: 2 }}>
                <p style={{ ...labelSt, marginBottom: 6 }}>Номинация</p>
                <select
                  value={filterNom}
                  onChange={(e) => {
                    setFilterNom(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    background: "#121216",
                    border: "1px solid #2a2a32",
                    borderRadius: 6,
                    color: "#f2f0ec",
                    fontSize: 13,
                    fontFamily: F,
                    padding: "8px 12px",
                    outline: "none",
                  }}
                >
                  <option value="all">Все номинации</option>
                  {NOMINATIONS_LIST.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} — {n.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ ...labelSt, marginBottom: 6 }}>Статус</p>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as AppStatus | "all");
                    setPage(1);
                  }}
                  style={{
                    width: "100%",
                    background: "#121216",
                    border: "1px solid #2a2a32",
                    borderRadius: 6,
                    color: "#f2f0ec",
                    fontSize: 13,
                    fontFamily: F,
                    padding: "8px 12px",
                    outline: "none",
                  }}
                >
                  <option value="all">Все</option>
                  {(Object.keys(STATUS_META) as AppStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setFilterNom("all");
                  setFilterStatus("all");
                  setSearch("");
                  setPage(1);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #2a2a32",
                  borderRadius: 6,
                  color: "#6a6a72",
                  fontSize: 12,
                  fontFamily: F,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                Сбросить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && canEdit && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ marginBottom: 12, position: "relative", zIndex: 200 }}
          >
            <div
              style={{
                background: "#0804ff0d",
                border: "1px solid #0804ff33",
                borderRadius: 10,
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <ListChecks size={16} color="#0804ff" />
              <span
                style={{ color: "#f2f0ec", fontSize: 13, fontFamily: F, fontWeight: 600 }}
              >
                Выбрано: {selected.size}
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => applyBulk("export")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "1px solid #2a2a32",
                  borderRadius: 7,
                  color: "#9a9aa4",
                  fontSize: 12,
                  fontFamily: F,
                  fontWeight: 600,
                  padding: "6px 14px",
                  cursor: "pointer",
                }}
              >
                <DownloadSimple size={13} /> Экспорт выбранных
              </button>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowBulkMenu((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#0804ff",
                    border: "none",
                    borderRadius: 7,
                    color: "#f2f0ec",
                    fontSize: 12,
                    fontFamily: F,
                    fontWeight: 600,
                    padding: "6px 14px",
                    cursor: "pointer",
                  }}
                >
                  <ArrowCounterClockwise size={13} /> Изменить статус{" "}
                  <CaretDown size={10} />
                </button>
                <AnimatePresence>
                  {showBulkMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        right: 0,
                        background: "#0d0d12",
                        border: "1px solid #2a2a32",
                        borderRadius: 10,
                        padding: 8,
                        zIndex: 300,
                        minWidth: 180,
                      }}
                    >
                      {(Object.keys(STATUS_META) as AppStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setBulkStatus(s);
                            applyBulk("status");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            background: "none",
                            border: "none",
                            padding: "8px 10px",
                            borderRadius: 6,
                            cursor: "pointer",
                            color: STATUS_META[s].color,
                            fontFamily: F,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#1a1a22")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                        >
                          {STATUS_META[s].icon} {STATUS_META[s].label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => setSelected(new Set())}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6a6a72",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div
        style={{
          background: "#0d0d12",
          border: "1px solid #2a2a32",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 110px 1fr 190px 140px 90px 90px 36px",
            padding: "10px 16px",
            background: "#0a0a0f",
            borderBottom: "1px solid #2a2a32",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={togglePage}
          >
            {allPageSelected ? (
              <CheckSquare size={15} color="#0804ff" weight="fill" />
            ) : (
              <Square size={15} color="#3a3a46" />
            )}
          </div>
          {[
            { label: "ID", key: "id" as const },
            { label: "Номинант", key: null },
            { label: "Номинация", key: null },
            { label: "Статус", key: null },
            { label: "Балл", key: "score" as const },
            { label: "Дата подачи", key: "submittedAt" as const },
            { label: "", key: null },
          ].map((col, i) => (
            <div
              key={i}
              onClick={col.key ? () => toggleSort(col.key!) : undefined}
              style={{
                color: "#3a3a46",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1px",
                fontFamily: F,
                textTransform: "uppercase",
                cursor: col.key ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {col.label}
              {col.key && <SortIcon field={col.key} />}
            </div>
          ))}
        </div>

        {paginated.length === 0 ? (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <p style={{ color: "#4a4a56", fontSize: 14, fontFamily: F }}>
              Заявки не найдены
            </p>
          </div>
        ) : (
          paginated.map((app, i) => {
            const mx = calcMax(app.scores);
            const isSelected = selected.has(app.id);
            const isScored = app.score !== null;
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 110px 1fr 190px 140px 90px 90px 36px",
                  padding: "13px 16px",
                  borderBottom: "1px solid #131318",
                  background: isSelected ? "#0804ff08" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  !isSelected && (e.currentTarget.style.background = "#111118")
                }
                onMouseLeave={(e) =>
                  !isSelected && (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{ display: "flex", alignItems: "center" }}
                  onClick={() => toggleSelect(app.id)}
                >
                  {isSelected ? (
                    <CheckSquare
                      size={15}
                      color="#0804ff"
                      weight="fill"
                      style={{ cursor: "pointer" }}
                    />
                  ) : (
                    <Square size={15} color="#3a3a46" style={{ cursor: "pointer" }} />
                  )}
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                  onClick={() => onOpen(app.id)}
                >
                  <span
                    style={{
                      color: "#4a4a56",
                      fontSize: 10,
                      fontFamily: "monospace",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {app.id}
                  </span>
                </div>
                <div
                  onClick={() => onOpen(app.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    paddingRight: 12,
                    cursor: "pointer",
                  }}
                >
                  <p
                    style={{
                      color: "#f2f0ec",
                      fontSize: 13,
                      fontFamily: F,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {app.nomLastName} {app.nomFirstName}
                  </p>
                  <p style={{ color: "#6a6a72", fontSize: 11, fontFamily: F }}>
                    {app.nomRegion}
                  </p>
                </div>
                <div
                  onClick={() => onOpen(app.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingRight: 10,
                    cursor: "pointer",
                  }}
                >
                  <p
                    style={{
                      color: "#9a9aa4",
                      fontSize: 11,
                      fontFamily: F,
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: "#0804ff", fontWeight: 700 }}>
                      {app.nomination}
                    </span>{" "}
                    {app.nominationTitle.length > 28
                      ? app.nominationTitle.slice(0, 28) + "…"
                      : app.nominationTitle}
                  </p>
                </div>
                <div
                  onClick={() => onOpen(app.id)}
                  style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                >
                  <StatusBadge status={app.status} />
                </div>
                <div
                  onClick={() => onOpen(app.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  {isScored ? (
                    <span
                      style={{
                        color:
                          app.score! / mx >= 0.8
                            ? "#22c55e"
                            : app.score! / mx >= 0.5
                              ? "#f59e0b"
                              : "#ef4444",
                        fontWeight: 700,
                        fontSize: 15,
                        fontFamily: F,
                      }}
                    >
                      {app.score}
                      <span style={{ fontSize: 10, color: "#4a4a56", fontWeight: 400 }}>
                        /{mx}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "#3a3a46", fontFamily: F, fontSize: 13 }}>
                      —
                    </span>
                  )}
                </div>
                <div
                  onClick={() => onOpen(app.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color: "#6a6a72", fontSize: 11, fontFamily: F }}>
                    {fmtDateShort(app.submittedAt)}
                  </span>
                  <span style={{ color: "#3a3a46", fontSize: 10, fontFamily: F }}>
                    {new Date(app.submittedAt).toLocaleTimeString("ru", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => onOpen(app.id)}
                >
                  <Eye
                    size={14}
                    color="#3a3a46"
                    weight="duotone"
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#4a4a56", fontSize: 12, fontFamily: F }}>Строк:</span>
          {PAGE_SIZE_OPTIONS.map((ps) => (
            <button
              key={ps}
              onClick={() => {
                setPageSize(ps);
                setPage(1);
              }}
              style={{
                background: pageSize === ps ? "#1e1e28" : "transparent",
                border: "none",
                borderRadius: 5,
                color: pageSize === ps ? "#f2f0ec" : "#4a4a56",
                fontFamily: F,
                fontSize: 12,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              {ps}
            </button>
          ))}
          <span style={{ color: "#3a3a46", fontSize: 11, fontFamily: F, marginLeft: 8 }}>
            {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, filtered.length)} из {filtered.length}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            style={{
              background: "none",
              border: "1px solid #2a2a32",
              borderRadius: 6,
              color: safePage === 1 ? "#2a2a32" : "#9a9aa4",
              fontFamily: F,
              fontSize: 12,
              padding: "5px 10px",
              cursor: safePage === 1 ? "default" : "pointer",
            }}
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{
              background: "none",
              border: "1px solid #2a2a32",
              borderRadius: 6,
              color: safePage === 1 ? "#2a2a32" : "#9a9aa4",
              fontFamily: F,
              fontSize: 12,
              padding: "5px 10px",
              cursor: safePage === 1 ? "default" : "pointer",
            }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - safePage) <= 2)
            .map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  background: p === safePage ? "#0804ff" : "transparent",
                  border: `1px solid ${p === safePage ? "#0804ff" : "#2a2a32"}`,
                  borderRadius: 6,
                  color: p === safePage ? "#f2f0ec" : "#9a9aa4",
                  fontFamily: F,
                  fontSize: 12,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{
              background: "none",
              border: "1px solid #2a2a32",
              borderRadius: 6,
              color: safePage === totalPages ? "#2a2a32" : "#9a9aa4",
              fontFamily: F,
              fontSize: 12,
              padding: "5px 10px",
              cursor: safePage === totalPages ? "default" : "pointer",
            }}
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            style={{
              background: "none",
              border: "1px solid #2a2a32",
              borderRadius: 6,
              color: safePage === totalPages ? "#2a2a32" : "#9a9aa4",
              fontFamily: F,
              fontSize: 12,
              padding: "5px 10px",
              cursor: safePage === totalPages ? "default" : "pointer",
            }}
          >
            »
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export interface AdminAppProps {
  initialApps: Application[];
  currentUser: AdminUser;
}

/** Левая навигация админки (редизайн: сайдбар вместо верхней панели). */
function Sidebar({
  view,
  setView,
  nav,
  currentUser,
  appsCount,
  newCount,
  onExportCsv,
}: {
  view: View;
  setView: (v: View) => void;
  nav: { key: View; label: string; icon: React.ReactNode }[];
  currentUser: AdminUser;
  appsCount: number;
  newCount: number;
  onExportCsv: () => void;
}) {
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const Label = ({ t }: { t: string }) => (
    <p
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "1px",
        color: "#5c5c66",
        textTransform: "uppercase",
        padding: "14px 8px 6px",
        margin: 0,
      }}
    >
      {t}
    </p>
  );
  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "9px 10px",
    borderRadius: 9,
    border: "none",
    background: active ? "#2b4cff1f" : "transparent",
    color: active ? "#c9d1ff" : "#9a9aa4",
    fontWeight: 500,
    fontSize: 13.5,
    fontFamily: F,
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    textDecoration: "none",
  });
  const Badge = ({ n, active }: { n: number; active?: boolean }) => (
    <span
      style={{
        marginLeft: "auto",
        fontSize: 11,
        fontFamily: MONO,
        background: active ? "#2b4cff" : "#ffffff12",
        color: active ? "#fff" : "#9a9aa4",
        padding: "1px 7px",
        borderRadius: 20,
        minWidth: 20,
        textAlign: "center",
      }}
    >
      {n}
    </span>
  );

  return (
    <aside
      style={{
        background: "#0d0d11",
        borderRight: "1px solid #1d1d25",
        display: "flex",
        flexDirection: "column",
        padding: "18px 14px",
        gap: 2,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 14px" }}>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.5px", color: "#f2f0ec" }}>
          ТРУД
        </span>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#2b4cff", fontStyle: "italic" }}>
          КРУТ
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.8px",
            color: currentUser.role === "superadmin" ? "#2b4cff" : "#9a9aa4",
            border: `1px solid ${currentUser.role === "superadmin" ? "#2b4cff44" : "#2a2a32"}`,
            borderRadius: 5,
            padding: "3px 6px",
            textTransform: "uppercase",
          }}
        >
          {ROLE_META[currentUser.role].label}
        </span>
      </div>

      <Label t="Работа" />
      {nav.map((n) => {
        const active = view === n.key && view !== "detail";
        return (
          <button key={n.key} onClick={() => setView(n.key)} style={itemStyle(active)}>
            {n.icon}
            {n.label}
            {n.key === "list" && <Badge n={appsCount} active={active} />}
          </button>
        );
      })}

      <Label t="Оценка" />
      <a href="/admin/jury" style={itemStyle(false)}>
        <User size={16} /> Жюри
      </a>
      <a href="/admin/ranking" style={itemStyle(false)}>
        <ChartBar size={16} /> Рейтинг
      </a>
      <a href="/admin/protocol" style={itemStyle(false)}>
        <FileText size={16} /> Протокол
      </a>
      <a href="/admin/mailing" style={itemStyle(false)}>
        <PaperPlaneTilt size={16} /> Рассылка
      </a>

      <div style={{ flex: 1 }} />

      <Label t="Экспорт" />
      <button onClick={onExportCsv} style={itemStyle(false)}>
        <DownloadSimple size={16} /> Выгрузка CSV
      </button>
      <a href="/admin/export" style={itemStyle(false)}>
        <DownloadSimple size={16} /> Таблица Excel
      </a>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
          padding: 9,
          borderRadius: 10,
          border: "1px solid #1d1d25",
          background: "#111117",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: ROLE_META[currentUser.role].color + "22",
            border: `1px solid ${ROLE_META[currentUser.role].color}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: ROLE_META[currentUser.role].color,
            fontWeight: 800,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {currentUser.displayName.charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 12.5,
              fontWeight: 600,
              lineHeight: 1.25,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentUser.displayName}
          </p>
          <p
            style={{
              color: ROLE_META[currentUser.role].color,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {ROLE_META[currentUser.role].label}
          </p>
        </div>
        <button
          onClick={() => void signOut({ callbackUrl: "/login" })}
          title="Выйти"
          style={{
            marginLeft: "auto",
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid #2a2a32",
            borderRadius: 8,
            color: "#5c5c66",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <SignOut size={15} />
        </button>
      </div>
      {newCount > 0 && (
        <p style={{ color: "#5b8def", fontSize: 11, fontFamily: F, margin: "10px 4px 0" }}>
          {newCount} новых заявок ждут разбора
        </p>
      )}
    </aside>
  );
}

export function AdminApp({ initialApps, currentUser }: AdminAppProps) {
  const [apps, setApps] = useState<Application[]>(initialApps);
  const [view, setView] = useState<View>("list");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [listIds, setListIds] = useState<string[]>(initialApps.map((a) => a.id));

  const canEdit = currentUser.role !== "viewer";
  const detailApp = detailId ? (apps.find((a) => a.id === detailId) ?? null) : null;

  const openDetail = useCallback((id: string, ids?: string[]) => {
    setDetailId(id);
    if (ids) setListIds(ids);
    setView("detail");
  }, []);

  const saveApp = useCallback((updated: Application, andBack = true) => {
    setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (andBack) setView("list");
    // Персист статуса + комментария + заметки; письма заявителю — в server action.
    void saveApplication(
      updated.id,
      updated.status,
      updated.expertComment ?? "",
      updated.internalNote ?? "",
    );
  }, []);

  const deleteApp = useCallback((id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
    setView("list");
    void deleteApplication(id);
  }, []);

  const bulkUpdate = useCallback((ids: string[], status: AppStatus) => {
    setApps((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, status } : a)));
    void bulkUpdateStatus(ids, status);
  }, []);

  const NAV: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "list", label: "Заявки", icon: <Rows size={14} /> },
    { key: "compare", label: "Сравнение", icon: <GitDiff size={14} /> },
    { key: "dashboard", label: "Дашборд", icon: <ChartBar size={14} /> },
  ];

  // Необработанные (новые) заявки — счётчик для уведомления в шапке.
  const newCount = apps.filter((a) => a.status === "new").length;

  return (
    <div style={{ minHeight: "100vh", background: "#08080a", fontFamily: F, display: "grid", gridTemplateColumns: "236px 1fr" }}>
      <Sidebar
        view={view}
        setView={setView}
        nav={NAV}
        currentUser={currentUser}
        appsCount={apps.length}
        newCount={newCount}
        onExportCsv={() => exportCSV(apps)}
      />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Views */}
      <AnimatePresence mode="wait">
        {view === "detail" && detailApp ? (
          <DetailView
            key="detail"
            app={detailApp}
            allIds={listIds}
            canEdit={canEdit}
            onBack={() => setView("list")}
            onSave={(a) => saveApp(a, true)}
            onDelete={deleteApp}
            onNavigate={(id) => {
              setDetailId(id);
            }}
          />
        ) : view === "compare" ? (
          <CompareView
            key="compare"
            apps={apps}
            onOpen={(id) =>
              openDetail(
                id,
                apps
                  .filter(
                    (a) => a.nomination === apps.find((x) => x.id === id)?.nomination,
                  )
                  .map((a) => a.id),
              )
            }
          />
        ) : view === "dashboard" ? (
          <DashboardView key="dashboard" apps={apps} />
        ) : (
          <ListView
            key="list"
            apps={apps}
            canEdit={canEdit}
            onOpen={(id) =>
              openDetail(
                id,
                apps.map((a) => a.id),
              )
            }
            onBulkUpdate={bulkUpdate}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
