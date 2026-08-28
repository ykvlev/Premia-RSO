import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`subscribe:ip:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Слишком много запросов" }, { status: 429 });
    }
    const body = await req.json();
    const { email } = schema.parse(body);
    if (!rateLimit(`subscribe:email:${email.toLowerCase()}`, 2, 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Этот email уже подписан" }, { status: 429 });
    }
    // Пока отдельная модель подписок не нужна: событие передаётся в лог для подключения рассылки.
    console.log("[subscribe]", email.toLowerCase());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный email" }, { status: 400 });
  }
}
