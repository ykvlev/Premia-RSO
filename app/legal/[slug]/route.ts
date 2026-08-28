import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const map: Record<string, { file: string; asciiName: string }> = {
  privacy: { file: "Пользовательское_соглашение_Труд_крут.pdf", asciiName: "privacy-policy.pdf" },
  consent: { file: "Согласие_на_обработку_персональных_данных_Труд_крут.pdf", asciiName: "consent.pdf" },
  cookie: { file: "Информация_об_использовании_cookie_Труд_крут.pdf", asciiName: "cookie-policy.pdf" },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const entry = map[slug];

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "docs", entry.file);
  const buffer = await fs.readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${entry.asciiName}"; filename*=UTF-8''${encodeURIComponent(entry.file)}`,
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
