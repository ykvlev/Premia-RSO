/**
 * GET /admin/super/impersonate?token=xxx
 * Устанавливает httpOnly session cookie (формат NextAuth/Auth.js) и редиректит в кабинет.
 */
import { NextResponse, type NextRequest } from "next/server";
import { decode } from "next-auth/jwt";
import { requestOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Next 16 синтезирует request.url как localhost:PORT — редиректы строим от публичного origin.
  const origin = requestOrigin(request);
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/admin/super", origin));
  }

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/admin/super?error=no_secret", origin));
  }

  // Cookie-имя должно совпадать с тем, что использовал encode() в impersonateUser
  // (зависит от https — иначе salt для HKDF разъедется и decode всегда провалится).
  const proto = request.headers.get("x-forwarded-proto");
  const secureCookie = proto === "https" || request.nextUrl.protocol === "https:";
  const cookieName = `${secureCookie ? "__Secure-" : ""}authjs.session-token`;

  let payload: Record<string, unknown> | null;
  try {
    payload = await decode({ token, secret, salt: cookieName });
  } catch {
    payload = null;
  }

  const role = payload?.role;
  if (!payload?.id || !role) {
    return NextResponse.redirect(new URL("/admin/super?error=invalid_token", origin));
  }

  let target = "/cabinet";
  if (role === "jury") target = "/jury";
  else if (role === "admin" || role === "superadmin") target = "/admin";

  const response = NextResponse.redirect(new URL(target, origin));

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return response;
}
