import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET() {
  await requireRole("superadmin");
  const flags = await db.featureFlag.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ flags });
}

export async function POST(req: NextRequest) {
  await requireRole("superadmin");
  const body = await req.json();
  const { key, label, description } = body;
  if (!key || !label) return NextResponse.json({ error: "key and label required" }, { status: 400 });

  const existing = await db.featureFlag.findUnique({ where: { key } });
  if (existing) return NextResponse.json({ error: "Key already exists" }, { status: 409 });

  const flag = await db.featureFlag.create({ data: { key, label, description: description || null } });
  return NextResponse.json({ flag });
}

export async function PATCH(req: NextRequest) {
  await requireRole("superadmin");
  const { id, enabled } = await req.json();
  if (!id || typeof enabled !== "boolean") return NextResponse.json({ error: "id and enabled required" }, { status: 400 });
  const flag = await db.featureFlag.update({ where: { id }, data: { enabled } });
  return NextResponse.json({ flag });
}

export async function DELETE(req: NextRequest) {
  await requireRole("superadmin");
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.featureFlag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
