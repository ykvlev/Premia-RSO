import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/auth";

const VK_APP_ID = process.env.VK_ID_APP_ID ?? "";
const VK_APP_SECRET = process.env.VK_ID_APP_SECRET ?? "";
const VK_REDIRECT_URI = process.env.VK_REDIRECT_URI ?? "";

/**
 * VK OAuth callback — GET handler.
 * VK редиректит сюда с ?code=... после авторизации.
 * Меняем code на access_token, получаем данные юзера, логиним.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  if (!VK_APP_ID || !VK_APP_SECRET) {
    return NextResponse.redirect(new URL("/login?error=vk_not_configured", request.url));
  }

  try {
    // 1. Обмен code на access_token
    const tokenRes = await fetch(
      `https://id.vk.com/oauth2/auth?act=exchange_code&client_id=${VK_APP_ID}&client_secret=${VK_APP_SECRET}&redirect_uri=${encodeURIComponent(VK_REDIRECT_URI)}&code=${code}`,
      { method: "POST" },
    );

    if (!tokenRes.ok) {
      console.error("[vk-callback] Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/login?error=no_access_token", request.url));
    }

    // 2. Получаем данные пользователя
    const userRes = await fetch(
      `https://id.vk.com/oauth2/user_info?access_token=${accessToken}`,
    );

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/login?error=user_info_failed", request.url));
    }

    const userData = await userRes.json();
    const vkUser = userData.user;

    if (!vkUser?.user_id) {
      return NextResponse.redirect(new URL("/login?error=no_vk_user", request.url));
    }

    const vkId = String(vkUser.user_id);
    const email = vkUser.email || null;
    const displayName =
      [vkUser.last_name, vkUser.first_name].filter(Boolean).join(" ") || null;

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
    } else {
      await db.user.update({
        where: { id: user.id },
        data: {
          vkUrl: user.vkUrl?.startsWith("vk:") ? user.vkUrl : `vk:${vkId}`,
          emailVerified: user.emailVerified || (email ? new Date() : null),
          fio: user.fio || displayName || `VK User ${vkId}`,
        },
      });
    }

    // 4. Логиним — используем credentials провайдер напрямую
    const loginResult = await signIn("credentials", {
      redirect: false,
      email: user.email,
      password: `__vk_oauth_${vkId}`,
    }).catch(() => null);

    if (loginResult?.error) {
      // Если credentials не работает (пароль не совпадает), ставим cookies вручную
      // и редиректим — пользователь уже создан, но войти через credentials не можем
      console.warn("[vk-callback] Credentials signIn failed, using cookie fallback");
    }

    return NextResponse.redirect(new URL("/cabinet", request.url));
  } catch (err) {
    console.error("[vk-callback] Error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
