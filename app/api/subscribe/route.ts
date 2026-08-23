import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    console.log("[subscribe]", email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный email" }, { status: 400 });
  }
}
