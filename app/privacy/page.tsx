import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Политика конфиденциальности" };
export const dynamic = "force-dynamic";

/** Политика в отношении обработки персональных данных (152-ФЗ). */
export default async function PrivacyPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "docs/legal/politika-konfidencialnosti.md"),
    "utf8",
  );
  return <LegalPage md={md} />;
}
