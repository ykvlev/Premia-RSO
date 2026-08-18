"use server";

import crypto from "node:crypto";
import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";
import {
  buildPayloadSchema,
  commonFieldsSchema,
  fileFields,
  type FormField,
} from "@/lib/application-schema";
import { headers } from "next/headers";
import { verifyCaptcha } from "@/lib/captcha";
import { checkEmailPolicy } from "@/lib/email-policy";
import { sendMail } from "@/lib/mail";
import { notifyTelegram, tgEscape } from "@/lib/telegram";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/net";
import { putObject } from "@/lib/storage";
import { isAllowedMime, uploadConfig } from "@/lib/upload-config";
import { brand } from "@/lib/brand";
import { measure, recordError } from "@/lib/observability";
import type { Prisma } from "@/lib/generated/prisma/client";

export type SubmitResult =
  | { ok: true; applicationId: string }
  | { ok: false; errors: Record<string, string>; formError?: string };

/** Сбор ошибок Zod в карту поле→сообщение. */
function zodErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const map: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!map[key]) map[key] = i.message;
  }
  return map;
}

export async function submitApplication(formData: FormData): Promise<SubmitResult> {
  // ── 0. Антифлуд: не более 5 заявок с одного IP в час ──────────────────
  if (!rateLimit(`apply:${await requestIp()}`, 5, 60 * 60 * 1000)) {
    return {
      ok: false,
      errors: {},
      formError: "Слишком много заявок с одного адреса. Попробуйте позже.",
    };
  }

  // ── 1. Окно приёма (серверная проверка, SPEC §7 п.8) ──────────────────
  const season = await db.season.findFirst({ where: { isActive: true } });
  const now = new Date();
  if (!season || now < season.startAt || now > season.endAt) {
    return {
      ok: false,
      errors: {},
      formError: "Приём заявок сейчас закрыт.",
    };
  }

  // ── 2. Номинация принадлежит активному сезону ─────────────────────────
  const nominationId = String(formData.get("nominationId") ?? "");
  const nomination = await db.nomination.findFirst({
    where: { id: nominationId, seasonId: season.id },
  });
  if (!nomination) {
    return { ok: false, errors: { nominationId: "Выберите номинацию" } };
  }

  // ── 3. Капча (заглушка без ключа) ─────────────────────────────────────
  const captchaOk = await verifyCaptcha(formData.get("smart-token")?.toString());
  if (!captchaOk) {
    return { ok: false, errors: {}, formError: "Проверка капчи не пройдена." };
  }

  // ── 4. Общие поля ─────────────────────────────────────────────────────
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") raw[k] = v;
  }

  const common = commonFieldsSchema.safeParse({
    ...raw,
    consent: raw.consent === "on" || raw.consent === "true",
  });

  // ── 5. Спец-поля номинации из formSchema ──────────────────────────────
  const schemaFields = (nomination.formSchema ?? []) as FormField[];
  const payload = buildPayloadSchema(schemaFields).safeParse(raw);

  const errors: Record<string, string> = {
    ...(common.success ? {} : zodErrors(common.error.issues)),
    ...(payload.success ? {} : zodErrors(payload.error.issues)),
  };

  // ── 6. Файлы: обязательность, размер, формат ──────────────────────────
  const incoming: { field: FormField; file: File }[] = [];
  for (const f of fileFields(schemaFields)) {
    const value = formData.get(f.name);
    const file = value instanceof File && value.size > 0 ? value : null;
    if (!file) {
      if (f.required) errors[f.name] = "Приложите файл";
      continue;
    }
    if (file.size > uploadConfig.maxFileSizeBytes) {
      errors[f.name] =
        `Файл больше ${Math.round(uploadConfig.maxFileSizeBytes / 1024 / 1024)} МБ`;
      continue;
    }
    if (!isAllowedMime(file.type)) {
      errors[f.name] = "Недопустимый формат файла";
      continue;
    }
    incoming.push({ field: f, file });
  }

  if (Object.keys(errors).length > 0 || !common.success || !payload.success) {
    return { ok: false, errors };
  }

  // ── 7. Загрузка файлов и создание заявки ──────────────────────────────
  const attachments: { filename: string; url: string; size: number; mime: string }[] = [];
  for (const { file } of incoming) {
    const safeName = file.name.replace(/[^\w.\-а-яА-ЯёЁ ]/g, "_");
    const key = `applications/${season.year}/${crypto.randomUUID()}/${safeName}`;
    const body = Buffer.from(await file.arrayBuffer());
    await putObject({ key, body, contentType: file.type });
    attachments.push({ filename: file.name, url: key, size: file.size, mime: file.type });
  }

  const { consent: _consent, nominationId: _nid, ...commonData } = common.data;
  void _consent;
  void _nid;

  const application = await db.application.create({
    data: {
      nominationId: nomination.id,
      participantType: nomination.participantType,
      ...commonData,
      ogrn: commonData.ogrn || null,
      activityField: commonData.activityField || null,
      position: commonData.position || null,
      links: commonData.links || null,
      payload: payload.data as Prisma.InputJsonValue,
      attachments: { create: attachments },
    },
  });

  // ── 8. Письмо-подтверждение ───────────────────────────────────────────
  try {
    await sendMail({
      to: common.data.email,
      subject: `Заявка принята — ${brand.fullName}`,
      text: [
        `Здравствуйте, ${common.data.contactFio}!`,
        "",
        `Ваша заявка на ${brand.fullName} принята.`,
        `Номер заявки: ${application.id}`,
        `Номинация: ${nomination.title}`,
        `Организация: ${common.data.orgName}`,
        "",
        "Результаты рассмотрения будут направлены на этот адрес.",
        "",
        `— Оргкомитет, ${brand.org}`,
      ].join("\n"),
    });
  } catch (e) {
    // Заявка сохранена — падение почты не должно ломать сабмит
    console.error("Не удалось отправить письмо-подтверждение:", e);
  }

  return { ok: true, applicationId: application.id };
}

export type NomineeResult =
  { ok: true; applicationId: string } | { ok: false; error: string };

/**
 * Отправка заявки из макета-визарда (dark apply-flow): поля номинанта →
 * Application + payload. Фото номинанта → вложение. Обязательные колонки БД,
 * которых нет в макете (phone/email), заполняются заглушкой «—» (модель
 * подгоняется под макет заказчика; уточним позже).
 */
export async function submitNomineeApplication(
  formData: FormData,
): Promise<NomineeResult> {
  const season = await db.season.findFirst({ where: { isActive: true } });
  const now = new Date();
  if (!season) return { ok: false, error: "Приём заявок закрыт." };
  if (now < season.startAt) {
    const opens = season.startAt.toLocaleDateString("ru-RU");
    return { ok: false, error: `Приём заявок ещё не открыт. Старт — ${opens}.` };
  }
  if (now > season.endAt) return { ok: false, error: "Приём заявок завершён." };

  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const nomination = await db.nomination.findFirst({
    where: { seasonId: season.id, title: g("nominationTitle") },
  });
  if (!nomination) return { ok: false, error: "Номинация не найдена." };

  // Rate-limit: не более 5 заявок с одного IP в час (защита от флуда)
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
  if (!rateLimit(`apply:${ip}`, 5, 60 * 60 * 1000)) {
    return { ok: false, error: "Слишком много заявок с одного адреса. Попробуйте позже." };
  }

  // Капча (если настроена SMARTCAPTCHA_SERVER_KEY — иначе проходит)
  const captchaOk = await verifyCaptcha(formData.get("smart-token")?.toString());
  if (!captchaOk) return { ok: false, error: "Проверка капчи не пройдена." };

  // Политика почты: только российские / корпоративные адреса (не Gmail и т.п.)
  const emailPolicy = checkEmailPolicy(g("email"));
  if (!emailPolicy.ok) {
    return { ok: false, error: emailPolicy.reason ?? "Недопустимый адрес почты" };
  }

  const applicantFio = g("applicantFio");
  const isDynamic = g("dynamic") === "1";
  const attachments: { filename: string; url: string; size: number; mime: string }[] = [];

  const saveFile = async (file: File, labelForErr: string) => {
    if (file.size > uploadConfig.maxFileSizeBytes)
      throw new Error(`Файл «${labelForErr}» больше 10 МБ`);
    if (!isAllowedMime(file.type))
      throw new Error(`Недопустимый формат файла «${labelForErr}»`);
    const safe = file.name.replace(/[^\w.\-а-яА-ЯёЁ ]/g, "_");
    const key = `applications/${season.year}/${crypto.randomUUID()}/${safe}`;
    await putObject({ key, body: Buffer.from(await file.arrayBuffer()), contentType: file.type });
    attachments.push({ filename: file.name, url: key, size: file.size, mime: file.type });
  };

  let payload: Record<string, unknown>;
  let orgName: string;
  let inn: string;
  let region: string;
  let contactFio: string;
  let position: string | null;
  let nomineeName: string;

  if (isDynamic) {
    // Официальные поля номинации из formSchema (серверная валидация обязательных).
    const schemaFields = (nomination.formSchema ?? []) as FormField[];
    const p: Record<string, unknown> = {
      applicantFio,
      howKnew: g("howKnew"),
      consentNewsletter: g("consentNewsletter") === "true",
    };
    try {
      for (const f of schemaFields) {
        if (f.type === "file") {
          const file = formData.get(`f_${f.name}`);
          if (file instanceof File && file.size > 0) await saveFile(file, f.label);
          else if (f.required) return { ok: false, error: `Приложите файл: ${f.label}` };
        } else {
          const v = String(formData.get(`f_${f.name}`) ?? "").trim();
          if (f.required && !v) return { ok: false, error: `Заполните поле: ${f.label}` };
          p[f.name] = v;
        }
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Ошибка загрузки файла" };
    }
    payload = p;
    const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
    orgName = s("orgName") || applicantFio || "—";
    inn = s("orgInn") || "—";
    region = s("region") || "—";
    contactFio = applicantFio || s("fio") || "—";
    position = null;
    nomineeName = s("fio") || s("orgName") || applicantFio || "—";
  } else {
    const fio = [g("lastName"), g("firstName"), g("patronymic")].filter(Boolean).join(" ");
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) {
      try {
        await saveFile(photo, "Фото номинанта");
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Ошибка загрузки фото" };
      }
    }
    payload = {
      nominateSelf: g("nominateSelf"),
      howKnew: g("howKnew"),
      gender: g("gender"),
      birthDate: g("birthDate"),
      workplace: g("workplace"),
      position: g("position"),
      descActivity: g("descActivity"),
      descScale: g("descScale"),
      coverageLevel: g("coverageLevel"),
      additionalInfo: g("additionalInfo"),
      consentNewsletter: g("consentNewsletter") === "true",
      nomineeFio: fio,
      applicantFio,
    };
    orgName = g("workplace") || fio || "—";
    inn = g("inn") || "—";
    region = g("region") || "—";
    contactFio = applicantFio || fio || "—";
    position = g("position") || null;
    nomineeName = fio;
  }

  let application;
  try {
    application = await measure("apply.create", () =>
      db.application.create({
        data: {
          nominationId: nomination.id,
          participantType: g("participantType") || nomination.participantType,
          orgName,
          inn,
          region,
          contactFio,
          position,
          phone: g("phone") || "—",
          email: g("email") || "—",
          links: g("links") || null,
          payload: payload as Prisma.InputJsonValue,
          attachments: { create: attachments },
        },
      }),
    );
  } catch (e) {
    recordError(e, "submitNomineeApplication → application.create");
    return { ok: false, error: "Не удалось сохранить заявку. Попробуйте ещё раз." };
  }

  // Событие в аудит-лог (видно на панели супер-админа)
  try {
    await db.applicationEvent.create({
      data: {
        applicationId: application.id,
        actor: g("email") || "аноним",
        action: `Заявка подана · ${nomination.title}`,
      },
    });
  } catch {
    /* аудит не критичен для сабмита */
  }

  // ── Личный кабинет участника + письмо (падение почты не ломает сабмит) ──
  const applicantEmail = g("email");
  const applicantName = g("applicantFio") || "Участник";
  if (applicantEmail.includes("@")) {
    // Первая заявка с этого email → создаём аккаунт участника и высылаем доступ.
    // При повторных заявках аккаунт уже есть — пароль не присылаем.
    let newPassword = "";
    const existing = await db.user.findUnique({ where: { email: applicantEmail } });
    if (!existing) {
      const AL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      newPassword = Array.from({ length: 12 }, () => AL[crypto.randomInt(AL.length)]).join(
        "",
      );
      await db.user.create({
        data: {
          email: applicantEmail,
          fio: applicantName,
          role: "participant",
          passwordHash: hashSync(newPassword, 10),
        },
      });
    }

    const lines = [
      `Здравствуйте, ${applicantName}!`,
      "",
      `Ваша заявка на ${brand.fullName} отправлена и принята.`,
      `Номинация: ${nomination.title}`,
      `Номинант: ${nomineeName}`,
      `Номер заявки: ${application.id}`,
    ];
    if (newPassword) {
      lines.push(
        "",
        "Для вас создан личный кабинет — там видны все ваши заявки и их статусы.",
        "Вход: https://премиятрудкрут.рф/login",
        `Логин: ${applicantEmail}`,
        `Пароль: ${newPassword}`,
        "Сохраните эти данные — при следующих заявках пароль не присылается.",
      );
    } else {
      lines.push(
        "",
        "Все ваши заявки и их статусы — в личном кабинете на сайте (вход тот же).",
      );
    }
    lines.push(
      "",
      "Мы сообщим об изменении статуса заявки на этот адрес.",
      "",
      `— Оргкомитет, ${brand.org}`,
    );

    try {
      await sendMail({
        to: applicantEmail,
        subject: newPassword
          ? `Заявка принята, доступ в кабинет — ${brand.fullName}`
          : `Заявка отправлена — ${brand.fullName}`,
        text: lines.join("\n"),
      });
    } catch (e) {
      console.error("Письмо заявителю не отправлено:", e);
    }
  }

  // Уведомление оргкомитету в Telegram (если настроен бот) — не блокирует ответ.
  void notifyTelegram(
    [
      "🆕 <b>Новая заявка</b>",
      `Номинация: ${tgEscape(nomination.title)}`,
      `Номинант: ${tgEscape(nomineeName || g("email"))}`,
      `Регион: ${tgEscape(g("region") || "—")}`,
      "",
      "https://премиятрудкрут.рф/admin",
    ].join("\n"),
  );

  return { ok: true, applicationId: application.id };
}
