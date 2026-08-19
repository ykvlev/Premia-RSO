/**
 * GET /admin/super/impersonate?token=xxx
 * Устанавливает httpOnly session cookie и редиректит в кабинет.
 */
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/admin/super", request.url));
  }

  // Проверяем что токен валиден
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ""
    );
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secret);

    if (!payload.id || !payload.role) {
      return NextResponse.redirect(new URL("/admin/super?error=bad_token", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/admin/super?error=invalid_token", request.url));
  }

  // Определяем target
  let target = "/cabinet";
  try {
    const { decodeJwt } = await import("jose");
    const payload = decodeJwt(token);
    if (payload.role === "jury") target = "/jury";
    else if (payload.role === "admin" || payload.role === "superadmin") target = "/admin";
  } catch {}

  const response = NextResponse.redirect(new URL(target, request.url));

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });

  return response;
}
