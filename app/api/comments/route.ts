import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const applicationId = req.nextUrl.searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  // Verify user has access to this application
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { email: true, userId: true },
  });

  if (!app) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const email = session.user.email;
  const isAdmin = (session.user as any).role === "admin" || (session.user as any).role === "superadmin";
  const isJury = (session.user as any).role === "jury";
  const isOwner = app.email === email || app.userId === session.user.id;

  if (!isOwner && !isAdmin && !isJury) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const comments = await db.applicationComment.findMany({
    where: {
      applicationId,
      // Participants can't see internal comments
      ...(isOwner && !isAdmin ? { isInternal: false } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    comments: comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { applicationId, text, isInternal } = body as {
    applicationId?: string;
    text?: string;
    isInternal?: boolean;
  };

  if (!applicationId || !text?.trim()) {
    return NextResponse.json({ error: "applicationId and text required" }, { status: 400 });
  }

  if (text.length > 2000) {
    return NextResponse.json({ error: "text too long" }, { status: 400 });
  }

  // Verify access
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { email: true, userId: true },
  });

  if (!app) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const email = session.user.email;
  const isAdmin = (session.user as any).role === "admin" || (session.user as any).role === "superadmin";
  const isOwner = app.email === email || app.userId === session.user.id;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const role = isAdmin ? "admin" : "participant";
  const canBeInternal = isAdmin;

  const comment = await db.applicationComment.create({
    data: {
      applicationId,
      author: email,
      authorName: session.user.name || email.split("@")[0],
      authorRole: role,
      body: text.trim(),
      isInternal: canBeInternal && isInternal ? true : false,
    },
  });

  // Log event
  await db.applicationEvent.create({
    data: {
      applicationId,
      actor: email,
      action: `Добавлен комментарий${canBeInternal && isInternal ? " (внутренний)" : ""}`,
    },
  });

  return NextResponse.json({
    ok: true,
    comment: {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    },
  });
}
