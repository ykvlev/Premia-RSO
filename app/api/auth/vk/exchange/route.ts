import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/auth";

/**
 * VK ID OAuth exchange endpoint.
 * Принимает { code, deviceId } от VK ID SDK,
 * обменивает на access_token, получает user info, создаёт/ищет пользователя, входит.
 */

const VK_APP_ID = process.env.VK_ID_APP_ID ?? "";
const VK_APP_SECRET = process.env.VK_ID_APP_SECRET ?? "";

export async function POST(request: Request) {
  try {
    const { code, deviceId } = await request.json();

    if (!code || !deviceId) {
      return NextResponse.json({ ok: false, error: "Отсутствует code или deviceId" });
    }

    if (!VK_APP_ID || !VK_APP_SECRET) {
      return NextResponse.json({ ok: false, error: "VK OAuth не настроен на сервере" });
    }

    // 1. Обмен code на access_token
    const tokenRes = await fetch(
      `https://id.vk.com/oauth2/auth?act=exchange_code&client_id=${VK_APP_ID}&client_secret=${VK_APP_SECRET}&redirect_uri=${encodeURIComponent(process.env.VK_REDIRECT_URI ?? "")}&code=${code}&device_id=${deviceId}`,
      { method: "POST" },
    );

    if (!tokenRes.ok) {
      console.error("[vk-exchange] Token exchange failed:", await tokenRes.text());
      return NextResponse.json({ ok: false, error: "Не удалось обменять код на токен" });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Не получен access_token" });
    }

    // 2. Получаем информацию о пользователе
    const userRes = await fetch(
      `https://id.vk.com/oauth2/user_info?access_token=${accessToken}`,
    );

    if (!userRes.ok) {
      return NextResponse.json({ ok: false, error: "Не удалось получить данные пользователя" });
    }

    const userData = await userRes.json();
    const vkUser = userData.user;

    if (!vkUser?.user_id) {
      return NextResponse.json({ ok: false, error: "Данные пользователя VK пусты" });
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

    // 4. Входим через VK провайдер
    const result = await signIn("vk", {
      redirect: false,
      vkId,
      email: email ?? undefined,
      name: displayName ?? undefined,
    });

    if (result?.error) {
      return NextResponse.json({ ok: false, error: "Ошибка авторизации" });
    }

    return NextResponse.json({ ok: true, redirect: "/cabinet" });
  } catch (err) {
    console.error("[vk-exchange] Error:", err);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" });
  }
}
