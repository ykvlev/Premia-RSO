import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const map: Record<string, string> = {
  privacy: "Пользовательское_соглашение_Труд_крут.pdf",
  consent: "Согласие_на_обработку_персональных_данных_Труд_крут.pdf",
  cookie: "Информация_об_использовании_cookie_Труд_крут.pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const fileName = map[slug];

  if (!fileName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "docs", fileName);
  const buffer = await fs.readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "public, max-age=3600, immutable",
    },
  });
}
