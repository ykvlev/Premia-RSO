import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";

const VK_APP_ID = process.env.VK_ID_APP_ID ?? "";
const VK_APP_SECRET = process.env.VK_ID_APP_SECRET ?? "";
const VK_REDIRECT_URI = process.env.VK_REDIRECT_URI ?? "";

/**
 * VK ID OAuth callback — GET handler.
 * VK редиректит сюда с ?code=... и ?state=... после авторизации.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // VK returned an error
  if (error) {
    const desc = url.searchParams.get("error_description") || error;
    console.error("[vk-callback] VK error:", error, desc);
    return NextResponse.redirect(new URL(`/login?error=vk_${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  if (!VK_APP_ID || !VK_APP_SECRET) {
    console.error("[vk-callback] VK_ID_APP_ID or VK_ID_APP_SECRET not set");
    return NextResponse.redirect(new URL("/login?error=vk_not_configured", request.url));
  }

  try {
    // 1. Обмен code на access_token
    const tokenUrl = `https://id.vk.com/oauth2/auth` +
      `?act=exchange_code` +
      `&client_id=${VK_APP_ID}` +
      `&client_secret=${VK_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(VK_REDIRECT_URI)}` +
      `&code=${code}`;

    console.log("[vk-callback] Exchanging code for token...");

    const tokenRes = await fetch(tokenUrl, { method: "POST" });
    const tokenText = await tokenRes.text();
    console.log("[vk-callback] Token response:", tokenRes.status, tokenText.substring(0, 200));

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL(`/login?error=token_exchange_failed`, request.url));
    }

    let tokenData: Record<string, unknown>;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("[vk-callback] Failed to parse token response");
      return NextResponse.redirect(new URL("/login?error=token_parse_error", request.url));
    }

    const accessToken = tokenData.access_token as string | undefined;

    if (!accessToken) {
      console.error("[vk-callback] No access_token in response:", tokenData);
      return NextResponse.redirect(new URL("/login?error=no_access_token", request.url));
    }

    // 2. Получаем данные пользователя
    const userRes = await fetch(
      `https://id.vk.com/oauth2/user_info?access_token=${accessToken}`,
    );
    const userText = await userRes.text();
    console.log("[vk-callback] User info response:", userRes.status, userText.substring(0, 200));

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/login?error=user_info_failed", request.url));
    }

    const userData = JSON.parse(userText);
    const vkUser = userData.user;

    if (!vkUser?.user_id) {
      console.error("[vk-callback] No user in response:", userData);
      return NextResponse.redirect(new URL("/login?error=no_vk_user", request.url));
    }

    const vkId = String(vkUser.user_id);
    const email = vkUser.email || null;
    const displayName =
      [vkUser.last_name, vkUser.first_name].filter(Boolean).join(" ") || null;

    console.log("[vk-callback] VK user:", vkId, email, displayName);

    // 3. Ищем или создаём пользователя
    let user = await db.user.findFirst({ where: { vkUrl: `vk:${vkId}` } });

    if (!user && email) {
      user = await db.user.findUnique({ where: { email } });
    }

    if (!user) {
      const randomHash = hashSync(`vk_${Date.now()}_${Math.random()}`, 10);
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
      console.log("[vk-callback] Found existing user:", user.id);
    }

    // 4. Set session cookie using NextAuth signIn
    // We create a signed token and set it as session cookie
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.fio,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    // Determine redirect based on role
    const target =
      user.role === "jury"
        ? "/jury"
        : user.role === "admin" || user.role === "superadmin"
          ? "/admin"
          : "/cabinet";

    const response = NextResponse.redirect(new URL(target, request.url));

    // Set the next-auth session cookie
    // NextAuth v5 uses "authjs.session-token" for secure sessions
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    // Also set the non-secure variant for development
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[vk-callback] Error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
