import type { Metadata } from "next";
import { fontDisplay, fontHeading, fontBody } from "./fonts";
import { cn } from "@/lib/utils";
import { CookieConsent } from "@/components/cookie-consent";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const SITE_URL = "https://премиятрудкрут.рф";
const SITE_DESC =
  "Национальная премия Российских студенческих отрядов «Труд крут». Подача заявок, номинации, экспертная оценка достижений студотрядов и их партнёров.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Национальная премия «Труд крут»",
    template: "%s — «Труд крут»",
  },
  description: SITE_DESC,
  applicationName: "Труд крут",
  keywords: [
    "Труд крут",
    "национальная премия",
    "РСО",
    "Российские студенческие отряды",
    "студотряды",
    "номинации",
    "подать заявку",
    "премия студенческих отрядов",
  ],
  authors: [{ name: "МООО «РСО»" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "Национальная премия «Труд крут»",
    title: "Национальная премия «Труд крут»",
    description: SITE_DESC,
    images: [
      {
        url: "/brand/photos/about-ceremony.png",
        width: 1129,
        height: 636,
        alt: "Церемония Национальной премии «Труд крут»",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Национальная премия «Труд крут»",
    description: SITE_DESC,
    images: ["/brand/photos/about-ceremony.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={cn(
        "h-full antialiased",
        fontDisplay.variable,
        fontHeading.variable,
        fontBody.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <CookieConsent />
        <PwaRegister />
      </body>
    </html>
  );
}
