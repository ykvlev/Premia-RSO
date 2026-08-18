import localFont from "next/font/local";

/**
 * Фирменные шрифты РСО «Труд крут» (self-hosted, без внешних CDN — важно для 152-ФЗ).
 * Источники: брендбук РСО. Файлы сконвертированы в woff2 и лежат в app/fonts/.
 *
 * Actay Wide Bold — только крупные титулы / hero  → --font-actay
 * Stolzl (300/400/500/700) — заголовки и UI-текст → --font-stolzl
 * Onest (variable) — объёмная проза / body        → --font-onest
 *
 * ВНИМАНИЕ: имена переменных next/font (--font-actay/stolzl/onest) намеренно
 * отличаются от Tailwind-токенов (--font-display/heading/body), иначе возникает
 * циклическая ссылка. Связка настроена в app/globals.css (@theme).
 */

export const fontDisplay = localFont({
  src: [{ path: "./fonts/ActayWide-Bold.woff2", weight: "700", style: "normal" }],
  variable: "--font-actay",
  display: "swap",
});

export const fontHeading = localFont({
  src: [
    { path: "./fonts/Stolzl-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Stolzl-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Stolzl-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Stolzl-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-stolzl",
  display: "swap",
});

export const fontBody = localFont({
  src: [{ path: "./fonts/Onest-Variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-onest",
  display: "swap",
});
