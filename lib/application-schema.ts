import { z } from "zod";

/**
 * Zod-схемы заявки (SPEC §7 п.6): общие для клиента и сервера.
 * Общие поля — фиксированная схема; спец-поля номинации собираются
 * динамически из Nomination.formSchema (ключевой принцип SPEC §1).
 */

/** Поле формы номинации (структура элементов Nomination.formSchema). */
export type FormField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "url" | "file";
  required?: boolean;
  options?: string[];
};

/** Общие поля заявки (SPEC §7 п.2). */
export const commonFieldsSchema = z.object({
  nominationId: z.string().min(1, "Выберите номинацию"),
  orgName: z.string().trim().min(2, "Укажите название организации"),
  inn: z
    .string()
    .trim()
    .regex(/^(\d{10}|\d{12})$/, "ИНН — 10 или 12 цифр"),
  ogrn: z
    .string()
    .trim()
    .regex(/^(\d{13}|\d{15})$/, "ОГРН — 13 или 15 цифр")
    .or(z.literal(""))
    .optional(),
  region: z.string().trim().min(2, "Укажите регион"),
  activityField: z.string().trim().optional(),
  contactFio: z.string().trim().min(5, "Укажите ФИО контактного лица"),
  position: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{10,18}$/, "Проверьте формат телефона"),
  email: z.email("Проверьте формат email"),
  links: z.string().trim().optional(),
  consent: z.literal(true, {
    error: "Необходимо согласие на обработку персональных данных",
  }),
});

export type CommonFields = z.infer<typeof commonFieldsSchema>;

/**
 * Динамическая схема спец-полей номинации из formSchema.
 * Файловые поля валидируются отдельно (это File в FormData, не строки).
 */
export function buildPayloadSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodType> = {};

  for (const f of fields) {
    if (f.type === "file") continue;

    let s: z.ZodType;
    switch (f.type) {
      case "number":
        s = z.coerce
          .number({ error: "Введите число" })
          .min(0, "Число не может быть отрицательным");
        if (!f.required) s = s.optional().or(z.literal(""));
        break;
      case "url":
        s = z.url("Проверьте формат ссылки (https://…)");
        if (!f.required) s = s.optional().or(z.literal(""));
        break;
      case "select":
        s = z
          .string()
          .refine((v) => (f.options ?? []).includes(v), "Выберите значение из списка");
        if (!f.required) s = s.optional().or(z.literal(""));
        break;
      default: {
        // text | textarea
        const base = z.string().trim();
        s = f.required ? base.min(1, "Обязательное поле") : base.optional();
      }
    }
    shape[f.name] = s;
  }

  return z.object(shape);
}

/** Файловые поля из formSchema (валидируются на сервере отдельно). */
export function fileFields(fields: FormField[]): FormField[] {
  return fields.filter((f) => f.type === "file");
}
