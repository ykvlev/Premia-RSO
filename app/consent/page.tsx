import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Согласия на обработку персональных данных" };
export const dynamic = "force-dynamic";

/** Тексты согласий на обработку персональных данных. */
export default async function ConsentPage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "docs/legal/soglasiya.md"),
    "utf8",
  );
  return <LegalPage md={md} />;
}
