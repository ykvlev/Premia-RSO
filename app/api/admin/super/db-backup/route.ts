import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { execSync } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const BACKUP_DIR = join(process.cwd(), "backups");

export async function GET() {
  await requireRole("superadmin");
  try {
    await readdir(BACKUP_DIR).catch(() => { throw new Error("no dir"); });
    const files = await readdir(BACKUP_DIR);
    const backups = await Promise.all(
      files.filter((f) => f.endsWith(".sql.gz") || f.endsWith(".sql")).map(async (f) => {
        const s = await stat(join(BACKUP_DIR, f));
        return { name: f, size: s.size, date: s.mtime.toISOString() };
      })
    );
    backups.sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ backups: backups.slice(0, 50) });
  } catch {
    return NextResponse.json({ backups: [] });
  }
}

export async function POST() {
  await requireRole("superadmin");
  try {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(BACKUP_DIR, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup-${ts}.sql.gz`;
    const filepath = join(BACKUP_DIR, filename);

    // Get DB connection from env
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });

    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || "5432";
    const dbname = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    // pg_dump via psql env
    const cmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbname} --no-owner --no-privileges | gzip > "${filepath}"`;
    execSync(cmd, { timeout: 60000 });

    const s = await stat(filepath);
    return NextResponse.json({ ok: true, filename, size: s.size });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
