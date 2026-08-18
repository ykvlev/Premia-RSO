"use server";

import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/net";

/**
 * Поиск организации по ИНН через DaData (findById/party).
 * Токен — в env DADATA_TOKEN (бесплатный тариф подсказок). Запрос идёт с сервера.
 */

export type OrgLookup =
  | {
      ok: true;
      org: {
        name: string;
        inn: string;
        kpp: string | null;
        ogrn: string | null;
        address: string;
        status: string | null;
      };
    }
  | { ok: false; error: string };

export async function lookupInn(innRaw: string): Promise<OrgLookup> {
  // Антифлуд внешнего API DaData: не более 30 запросов с IP в минуту.
  if (!rateLimit(`inn:${await requestIp()}`, 30, 60_000)) {
    return { ok: false, error: "Слишком много запросов. Попробуйте через минуту." };
  }

  const inn = String(innRaw).replace(/\D/g, "");
  if (inn.length !== 10 && inn.length !== 12) {
    return { ok: false, error: "ИНН должен содержать 10 или 12 цифр" };
  }

  const token = process.env.DADATA_TOKEN;
  if (!token) {
    return { ok: false, error: "Поиск по ИНН пока не настроен" };
  }

  try {
    const res = await fetch(
      "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ query: inn, count: 1 }),
        cache: "no-store",
      },
    );
    if (!res.ok) return { ok: false, error: "Сервис поиска недоступен" };

    const json = (await res.json()) as {
      suggestions?: Array<{
        value?: string;
        data?: {
          inn?: string;
          kpp?: string | null;
          ogrn?: string | null;
          name?: { short_with_opf?: string; full_with_opf?: string };
          address?: { value?: string };
          state?: { status?: string };
        };
      }>;
    };

    const s = json.suggestions?.[0];
    const d = s?.data;
    if (!s || !d) {
      return { ok: false, error: "Организация с таким ИНН не найдена" };
    }

    return {
      ok: true,
      org: {
        name: d.name?.short_with_opf || d.name?.full_with_opf || s.value || "",
        inn: d.inn ?? inn,
        kpp: d.kpp ?? null,
        ogrn: d.ogrn ?? null,
        address: d.address?.value ?? "",
        status: d.state?.status ?? null,
      },
    };
  } catch {
    return { ok: false, error: "Ошибка сети при поиске" };
  }
}
