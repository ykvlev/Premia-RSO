/**
 * Единый источник бренд-констант РСО «Труд крут».
 * Значения — из официального брендбука РСО (слайды «Цвет», палитры направлений).
 * Правило брендбука: использование цветов вне основной палитры и палитр
 * направлений НЕДОПУСТИМО. Меняешь бренд — правишь этот файл + токены в globals.css.
 */

export const brand = {
  name: "Труд крут",
  fullName: "Национальная премия «Труд крут»",
  org: "Российские студенческие отряды",
  orgShort: "РСО",

  /** Основная палитра (RGB): синий 8/4/255, белый, серый 238, чёрный. */
  colors: {
    blue: "#0804FF", // фирменный акцент
    white: "#FFFFFF",
    gray: "#EEEEEE",
    black: "#000000",
  },

  logo: {
    color: "/brand/logo/logo-color.svg",
    white: "/brand/logo/logo-white.svg",
    black: "/brand/logo/logo-black.svg",
    colorPng: "/brand/logo/logo-color.png",
    osdColor: "/brand/logo/logo-osd-color.svg",
  },

  // Паттерн РСО собирается из квадратов/прямоугольников фирменных цветов
  // (правило брендбука). Готовых SVG-исходников паттерна в архиве нет —
  // лента строится в коде (см. PatternBand на лендинге).
} as const;

/**
 * Палитры направлений РСО (диджитал-версии, hex из брендбука).
 * Каждое направление = 3 оттенка: light (подложки), main (основной), dark (акцент/текст).
 * Ключи названы по цвету, а не по направлению — соответствие «цвет ↔ направление»
 * подтверждаем по брендбуку, когда понадобится (TODO при интеграции направлений).
 */
export const directionColors = {
  orange: { light: "#FFDEBF", main: "#FE9633", dark: "#FB7A00" },
  sky: { light: "#D4ECFF", main: "#4CACF7", dark: "#008FFF" },
  coral: { light: "#FFDFD4", main: "#FF794C", dark: "#FF4C0F" },
  blue: { light: "#E1E0FF", main: "#0453FF", dark: "#0040CB" },
  green: { light: "#DCFFE6", main: "#6DC185", dark: "#469E5F" },
  cyan: { light: "#D9FCFF", main: "#00DFF2", dark: "#00C5D6" },
  purple: { light: "#E8DDFF", main: "#8043F9", dark: "#6601E9" },
  red: { light: "#FFE5E3", main: "#FE4734", dark: "#E61F25" },
} as const;

export type DirectionColorKey = keyof typeof directionColors;

/**
 * Статусы заявок → подпись + цвета. Ключи совпадают с Prisma enum AppStatus.
 * solid — сплошной чип; light/dark — пара «подложка/текст» для мягких бейджей.
 * Все значения — из палитр направлений (других цветов брендбук не допускает).
 */
export const statusMeta = {
  new: { label: "Новая", solid: "#0453FF", light: "#E1E0FF", dark: "#0040CB" },
  review: {
    label: "На рассмотрении",
    solid: "#FE9633",
    light: "#FFDEBF",
    dark: "#FB7A00",
  },
  finalist: {
    label: "Финалист",
    solid: "#4CACF7",
    light: "#D4ECFF",
    dark: "#008FFF",
  },
  winner: { label: "Победитель", solid: "#0804FF", light: "#E1E0FF", dark: "#0804FF" },
  rejected: {
    label: "Отклонена",
    solid: "#E61F25",
    light: "#FFE5E3",
    dark: "#E61F25",
  },
} as const;

export type AppStatusKey = keyof typeof statusMeta;
