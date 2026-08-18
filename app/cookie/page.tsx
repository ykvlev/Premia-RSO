import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Политика в отношении файлов cookie" };
export const dynamic = "force-dynamic";

/** Политика в отношении файлов cookie. */
export default async function CookiePage() {
  const md = await fs.readFile(
    path.join(process.cwd(), "docs/legal/politika-cookie.md"),
    "utf8",
  );
  return <LegalPage md={md} />;
}
