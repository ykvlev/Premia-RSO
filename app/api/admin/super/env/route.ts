import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ENV_PATH = join(process.cwd(), ".env");

export async function GET() {
  await requireRole("superadmin");
  try {
    const content = await readFile(ENV_PATH, "utf-8");
    // mask passwords and secrets
    const masked = content.replace(/(PASSWORD|SECRET|KEY|TOKEN) *= *(.+)/gi, (match, key, val) => {
      return `${key} = ${val.slice(0, 4)}${"*".repeat(Math.max(0, val.length - 8))}${val.slice(-4)}`;
    });
    return NextResponse.json({ content: masked });
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать .env" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  await requireRole("superadmin");
  const { content } = await req.json();
  if (typeof content !== "string") return NextResponse.json({ error: "content required" }, { status: 400 });

  // backup before write
  try {
    const existing = await readFile(ENV_PATH, "utf-8");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    await writeFile(join(process.cwd(), `.env.bak.${ts}`), existing, "utf-8");
  } catch { /* ok if no backup */ }

  try {
    await writeFile(ENV_PATH, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
