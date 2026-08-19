"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/auth";

/** Обновление профиля участника. */
export async function updateProfile(data: {
  fio: string;
  phone: string;
  gender: string;
  birthDate: string;
  city: string;
  region: string;
  telegram: string;
  vkUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Необходима авторизация" };
  }

  const fio = data.fio.trim();
  const phone = data.phone.trim();
  const city = data.city.trim();
  const region = data.region.trim();
  const telegram = data.telegram.trim();
  const vkUrl = data.vkUrl.trim();

  if (!fio || fio.length < 2) {
    return { ok: false, error: "Введите ФИО" };
  }
  if (!phone || phone.length < 6) {
    return { ok: false, error: "Введите корректный номер телефона" };
  }
  if (!region) {
    return { ok: false, error: "Выберите регион" };
  }
  if (!city) {
    return { ok: false, error: "Введите город" };
  }
  if (!data.gender || !["Мужской", "Женский"].includes(data.gender)) {
    return { ok: false, error: "Выберите пол" };
  }
  if (!data.birthDate) {
    return { ok: false, error: "Введите дату рождения" };
  }

  let birthDate: Date;
  try {
    birthDate = new Date(data.birthDate);
    if (isNaN(birthDate.getTime())) throw new Error();
    // Проверяем разумный диапазон (1950–2015)
    const year = birthDate.getFullYear();
    if (year < 1950 || year > 2015) {
      return { ok: false, error: "Проверьте дату рождения" };
    }
  } catch {
    return { ok: false, error: "Некорректная дата рождения" };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        fio,
        phone,
        gender: data.gender,
        birthDate,
        city,
        region,
        telegram: telegram || null,
        vkUrl: vkUrl || null,
      },
    });
  } catch (err) {
    console.error("[profile] Update failed:", err);
    return { ok: false, error: "Ошибка сохранения. Попробуйте позже." };
  }

  return { ok: true };
}

/** Проверка завершённости профиля (все обязательные поля). */
export async function checkProfileComplete(): Promise<{ complete: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { complete: false };

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        fio: true,
        phone: true,
        gender: true,
        birthDate: true,
        city: true,
        region: true,
      },
    });
    if (!user) return { complete: false };

    const complete = Boolean(
      user.fio && user.phone && user.gender && user.birthDate && user.city && user.region,
    );
    return { complete };
  } catch {
    return { complete: false };
  }
}
