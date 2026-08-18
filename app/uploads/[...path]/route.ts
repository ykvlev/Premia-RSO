import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readLocalObject, storageDriver } from "@/lib/storage";

/**
 * Раздача вложений для ЛОКАЛЬНОГО драйвера хранилища.
 * Вложения содержат ПДн заявителей → доступ только персоналу (жюри/оргкомитет).
 * На проде с S3 этот роут не используется (pre-signed URL).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (storageDriver !== "local") {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  // Только авторизованный персонал; посторонним — 404 (не раскрываем наличие).
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "jury" && role !== "superadmin") {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const { path: parts } = await ctx.params;
  try {
    const buf = await readLocalObject(parts.join("/"));
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Disposition": "attachment" },
    });
  } catch {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
}
