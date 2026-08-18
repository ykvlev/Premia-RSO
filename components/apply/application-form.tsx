"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  buildPayloadSchema,
  commonFieldsSchema,
  fileFields,
  type FormField,
} from "@/lib/application-schema";
import { uploadConfig } from "@/lib/upload-config";
import { submitApplication } from "@/app/apply/actions";
import Link from "next/link";

export type NominationOption = {
  id: string;
  title: string;
  participantType: string;
  formSchema: FormField[];
};

const inputCls =
  "w-full rounded-none border border-black bg-white px-3 py-2.5 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-[color:var(--color-dir-red-dark)]">{message}</p>;
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="hud-label">
      {children}
      {required && <span className="text-[color:var(--color-primary)]"> *</span>}
    </span>
  );
}

/** Рендер одного спец-поля номинации из formSchema (SPEC §7 п.3). */
function DynamicField({ field, error }: { field: FormField; error?: string }) {
  const common = { name: field.name, id: field.name };
  return (
    <label className="flex flex-col gap-1.5" htmlFor={field.name}>
      <Label required={field.required}>{field.label}</Label>
      {field.type === "textarea" ? (
        <textarea {...common} rows={4} className={inputCls} />
      ) : field.type === "select" ? (
        <select {...common} className={inputCls} defaultValue="">
          <option value="" disabled>
            Выберите…
          </option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "file" ? (
        <>
          <input
            {...common}
            type="file"
            accept={uploadConfig.accept}
            className={`${inputCls} file:mr-3 file:border-0 file:bg-black file:px-3 file:py-1 file:text-sm file:text-white`}
          />
          <span className="text-xs text-[color:var(--color-muted-foreground)]">
            До {Math.round(uploadConfig.maxFileSizeBytes / 1024 / 1024)} МБ:{" "}
            {uploadConfig.accept.replaceAll(",", " ")}
          </span>
        </>
      ) : (
        <input
          {...common}
          type={
            field.type === "number" ? "number" : field.type === "url" ? "url" : "text"
          }
          inputMode={field.type === "number" ? "numeric" : undefined}
          className={inputCls}
        />
      )}
      <FieldError message={error} />
    </label>
  );
}

export function ApplicationForm({ nominations }: { nominations: NominationOption[] }) {
  const router = useRouter();
  const [nominationId, setNominationId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = useMemo(
    () => nominations.find((n) => n.id === nominationId) ?? null,
    [nominations, nominationId],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("nominationId", nominationId);

    // ── Клиентская валидация (те же схемы, что на сервере) ──────────────
    const raw: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string") raw[k] = v;

    const clientErrors: Record<string, string> = {};
    if (!nominationId) clientErrors.nominationId = "Выберите номинацию";

    const common = commonFieldsSchema.safeParse({
      ...raw,
      nominationId: nominationId || "x",
      consent: raw.consent === "on",
    });
    if (!common.success) {
      for (const i of common.error.issues) {
        const k = String(i.path[0] ?? "form");
        if (!clientErrors[k]) clientErrors[k] = i.message;
      }
    }

    if (selected) {
      const payload = buildPayloadSchema(selected.formSchema).safeParse(raw);
      if (!payload.success) {
        for (const i of payload.error.issues) {
          const k = String(i.path[0] ?? "form");
          if (!clientErrors[k]) clientErrors[k] = i.message;
        }
      }
      for (const f of fileFields(selected.formSchema)) {
        const file = fd.get(f.name);
        const has = file instanceof File && file.size > 0;
        if (f.required && !has) clientErrors[f.name] = "Приложите файл";
        if (has && (file as File).size > uploadConfig.maxFileSizeBytes) {
          clientErrors[f.name] =
            `Файл больше ${Math.round(uploadConfig.maxFileSizeBytes / 1024 / 1024)} МБ`;
        }
      }
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setPending(true);
    const res = await submitApplication(fd);
    if (res.ok) {
      router.push(`/apply/success?id=${res.applicationId}`);
      return;
    }
    setErrors(res.errors);
    setFormError(res.formError ?? "Проверьте выделенные поля");
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-10">
      {/* ── Шаг 1. Номинация ─────────────────────────────────────────── */}
      <section>
        <p className="hud-label mb-3">шаг 1 · номинация</p>
        <div className="flex flex-col gap-2">
          {nominations.map((n) => {
            const active = n.id === nominationId;
            return (
              <label
                key={n.id}
                className={`flex cursor-pointer items-center justify-between gap-4 border px-4 py-3 ${
                  active
                    ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-white"
                    : "border-black bg-white hover:bg-[color:var(--color-rso-gray)]"
                }`}
              >
                <input
                  type="radio"
                  name="nominationRadio"
                  value={n.id}
                  checked={active}
                  onChange={() => setNominationId(n.id)}
                  className="sr-only"
                />
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>
                  {n.title}
                </span>
                <span
                  className={`hud-label ${active ? "text-white/80" : ""}`}
                  style={active ? { color: "rgba(255,255,255,0.8)" } : undefined}
                >
                  {n.participantType}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError message={errors.nominationId} />
      </section>

      {/* ── Шаг 2. Общие данные организации ──────────────────────────── */}
      <section>
        <p className="hud-label mb-3">шаг 2 · данные организации</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <Label required>Название организации</Label>
            <input name="orgName" className={inputCls} />
            <FieldError message={errors.orgName} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label required>ИНН</Label>
            <input name="inn" inputMode="numeric" className={inputCls} />
            <FieldError message={errors.inn} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>ОГРН</Label>
            <input name="ogrn" inputMode="numeric" className={inputCls} />
            <FieldError message={errors.ogrn} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label required>Регион</Label>
            <input name="region" className={inputCls} />
            <FieldError message={errors.region} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Сфера деятельности</Label>
            <input name="activityField" className={inputCls} />
            <FieldError message={errors.activityField} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label required>ФИО контактного лица</Label>
            <input name="contactFio" className={inputCls} />
            <FieldError message={errors.contactFio} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Должность</Label>
            <input name="position" className={inputCls} />
            <FieldError message={errors.position} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label required>Телефон</Label>
            <input
              name="phone"
              type="tel"
              placeholder="+7 900 000-00-00"
              className={inputCls}
            />
            <FieldError message={errors.phone} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label required>Email</Label>
            <input name="email" type="email" className={inputCls} />
            <FieldError message={errors.email} />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <Label>Ссылки (сайт, соцсети, материалы)</Label>
            <textarea name="links" rows={3} className={inputCls} />
            <FieldError message={errors.links} />
          </label>
        </div>
      </section>

      {/* ── Шаг 3. Спец-поля номинации (рендер из formSchema) ────────── */}
      {selected && (
        <section>
          <p className="hud-label mb-3">шаг 3 · данные по номинации</p>
          <div className="flex flex-col gap-4">
            {selected.formSchema.map((f) => (
              <DynamicField key={f.name} field={f} error={errors[f.name]} />
            ))}
          </div>
        </section>
      )}

      {/* ── Согласие + отправка ──────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            className="mt-1 size-4 accent-[#0804FF]"
          />
          <span className="text-sm leading-relaxed">
            Я даю согласие на обработку персональных данных в соответствии с 152-ФЗ и{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2"
              target="_blank"
            >
              Политикой конфиденциальности
            </Link>
            . <span className="text-[color:var(--color-primary)]">*</span>
          </span>
        </label>
        <FieldError message={errors.consent} />

        {formError && (
          <p className="border border-[color:var(--color-dir-red-dark)] bg-[color:var(--color-dir-red-light)] px-4 py-3 text-sm text-[color:var(--color-dir-red-dark)]">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="self-start">
          {pending ? "Отправляем…" : "Отправить заявку"}
        </Button>
      </section>
    </form>
  );
}
