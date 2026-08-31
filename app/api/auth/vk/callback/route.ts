import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { encode } from "next-auth/jwt";
import { db } from "@/lib/db";

const VK_APP_ID = process.env.VK_ID_APP_ID ?? "";
const VK_APP_SECRET = process.env.VK_ID_APP_SECRET ?? "";
const VK_REDIRECT_URI = process.env.VK_REDIRECT_URI ?? "";
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

/**
 * VK ID OAuth callback — GET handler.
 * VK редиректит сюда с ?code=... после авторизации.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("[vk-callback] VK error:", error);
    return NextResponse.redirect(new URL("/login?error=vk_denied", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  if (!VK_APP_ID || !VK_APP_SECRET || !AUTH_SECRET) {
    console.error("[vk-callback] VK not configured");
    return NextResponse.redirect(new URL("/login?error=vk_not_configured", request.url));
  }

  try {
    // 1. Exchange code for access_token
    const tokenRes = await fetch(
      `https://id.vk.com/oauth2/auth?act=exchange_code` +
        `&client_id=${VK_APP_ID}` +
        `&client_secret=${VK_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(VK_REDIRECT_URI)}` +
        `&code=${code}`,
      { method: "POST" },
    );

    const tokenText = await tokenRes.text();
    console.log("[vk-callback] Token exchange:", tokenRes.status, tokenText.slice(0, 300));

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
    }

    const tokenData = JSON.parse(tokenText);
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?error=no_access_token", request.url));
    }

    // 2. Get user info
    const userRes = await fetch(`https://id.vk.com/oauth2/user_info?access_token=${accessToken}`);
    const userText = await userRes.text();
    console.log("[vk-callback] User info:", userRes.status, userText.slice(0, 300));

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/login?error=user_info_failed", request.url));
    }

    const vkUser = JSON.parse(userText).user;
    if (!vkUser?.user_id) {
      return NextResponse.redirect(new URL("/login?error=no_vk_user", request.url));
    }

    const vkId = String(vkUser.user_id);
    const email = vkUser.email || null;
    const displayName = [vkUser.last_name, vkUser.first_name].filter(Boolean).join(" ") || null;

    // 3. Find or create user
    let user = await db.user.findFirst({ where: { vkUrl: `vk:${vkId}` } });
    if (!user && email) {
      user = await db.user.findUnique({ where: { email } });
    }

    if (!user) {
      const randomHash = hashSync(`vk_${Date.now()}`, 10);
      user = await db.user.create({
        data: {
          fio: displayName || `VK User ${vkId}`,
          email: email || `vk_${vkId}@placeholder.local`,
          passwordHash: randomHash,
          vkUrl: `vk:${vkId}`,
          emailVerified: email ? new Date() : null,
          role: "participant",
        },
      });
      console.log("[vk-callback] Created user:", user.id);
    } else {
      await db.user.update({
        where: { id: user.id },
        data: {
          vkUrl: user.vkUrl?.startsWith("vk:") ? user.vkUrl : `vk:${vkId}`,
          emailVerified: user.emailVerified || (email ? new Date() : null),
          fio: user.fio || displayName || `VK User ${vkId}`,
        },
      });
      console.log("[vk-callback] Found user:", user.id);
    }

    // 4. Создаём сессию В ФОРМАТЕ NextAuth v5.
    //    Токен обязан быть закодирован через encode() с salt = имя cookie (HKDF):
    //    самодельный SignJWT NextAuth молча не распознаёт (см. фикс имперсонации),
    //    и пользователя бесконечно кидает /cabinet ↔ /login.
    //    В payload обязательно id — session callback берёт session.user.id = token.id,
    //    без него /cabinet и /profile кидают на /login.
    //    Имя cookie с __Secure- префиксом на https — иначе NextAuth его не прочитает.
    const secureCookie =
      request.headers.get("x-forwarded-proto") === "https" ||
      url.protocol === "https:";
    const cookieName = `${secureCookie ? "__Secure-" : ""}authjs.session-token`;

    const sessionToken = await encode({
      secret: AUTH_SECRET,
      salt: cookieName,
      maxAge: 8 * 60 * 60,
      token: {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.fio,
        role: user.role,
      },
    });

    const target =
      user.role === "jury"
        ? "/jury"
        : user.role === "admin" || user.role === "superadmin"
          ? "/admin"
          : "/cabinet";

    const response = NextResponse.redirect(new URL(target, request.url));

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[vk-callback] Server error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
