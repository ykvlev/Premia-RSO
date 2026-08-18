"use client";
/* Портирован из Figma Make макета заказчика (адаптирован под Next.js). */
/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-unused-vars */
import { useState, useRef, useCallback, useEffect } from "react";
import { SmartCaptcha, captchaEnabled } from "./smart-captcha";
import { isEmailAllowed, checkEmailPolicy } from "@/lib/email-policy";
import { useRouter } from "next/navigation";
import { submitNomineeApplication } from "@/app/apply/actions";
import { lookupInn } from "@/app/apply/lookup";
import { motion, AnimatePresence } from "motion/react";
import { NOMINATIONS } from "@/components/landing/dark-landing";
import { Confetti } from "@/components/apply/confetti";
import { ShareBrickCard } from "@/components/apply/share-brick-card";

// ─── Eligibility ──────────────────────────────────────────────────────────────

const ORG_TYPES = [
  "Физическое лицо",
  "Вуз",
  "Ссуз",
  "Региональное отделение",
  "Работодатель",
  "СМИ",
  "Орган власти",
] as const;
type OrgType = (typeof ORG_TYPES)[number];

const ELIGIBILITY: Record<string, OrgType[]> = {
  // 1.1 Организации / работодатели
  "01": ["Работодатель"],
  "02": ["Работодатель"],
  "03": ["Вуз"],
  "04": ["Ссуз"],
  "05": ["Работодатель"],
  // 1.2 Региональные отделения и участники движения
  "06": ["Региональное отделение"],
  "07": ["Физическое лицо"],
  "08": ["Физическое лицо"],
  // 1.3 Органы государственной власти
  "09": ["Орган власти"],
  "10": ["Орган власти"],
  // 1.4 СМИ
  "11": ["СМИ"],
  "12": ["СМИ"],
  "13": ["СМИ"],
};

// ─── Static option lists ──────────────────────────────────────────────────────

const REGIONS = [
  "Москва",
  "Санкт-Петербург",
  "Московская область",
  "Краснодарский край",
  "Республика Татарстан",
  "Свердловская область",
  "Ростовская область",
  "Нижегородская область",
  "Республика Башкортостан",
  "Самарская область",
  "Челябинская область",
  "Красноярский край",
  "Новосибирская область",
  "Омская область",
  "Иркутская область",
  "Ставропольский край",
  "Кемеровская область",
  "Волгоградская область",
  "Воронежская область",
  "Пермский край",
  "Саратовская область",
  "Тюменская область",
  "Приморский край",
  "Алтайский край",
  "Хабаровский край",
  "Республика Дагестан",
  "Оренбургская область",
  "Белгородская область",
  "Тульская область",
  "Ярославская область",
  "Рязанская область",
  "Ульяновская область",
  "Пензенская область",
  "Тверская область",
  "Курская область",
  "Владимирская область",
  "Чувашская республика",
  "Архангельская область",
  "Липецкая область",
  "Смоленская область",
  "Калининградская область",
  "Вологодская область",
  "Астраханская область",
  "Брянская область",
  "Мурманская область",
  "Орловская область",
  "Псковская область",
  "Новгородская область",
  "Кировская область",
  "Ивановская область",
  "Костромская область",
  "Калужская область",
  "Тамбовская область",
  "Курганская область",
  "Республика Коми",
  "Республика Карелия",
  "Республика Саха (Якутия)",
  "Республика Крым",
  "Севастополь",
  "Донецкая Народная Республика",
  "Луганская Народная Республика",
  "Запорожская область",
  "Херсонская область",
  "Другой регион",
];

const TARGET_GROUPS = [
  "Боец студенческого отряда",
  "Командир / руководитель отряда",
  "Сотрудник регионального отделения РСО",
  "Представитель работодателя",
  "Представитель вуза / ссуза",
  "Представитель органа власти",
  "Представитель СМИ",
  "Наставник / ветеран движения",
  "Другое",
];

const HOW_KNEW = [
  "Сайт РСО (trudkrut.ru)",
  "Социальные сети РСО",
  "Рассылка по email",
  "От руководителя / командира",
  "От коллег или однокурсников",
  "Региональное отделение",
  "СМИ и медиа",
  "Другой источник",
];

const COVERAGE_LEVELS = [
  "Локальный (уровень отряда / организации)",
  "Региональный (уровень субъекта РФ)",
  "Межрегиональный (несколько субъектов РФ)",
  "Федеральный (вся Россия)",
  "Международный",
];

const NOMINATE_OPTIONS: Record<string, string[]> = {
  "Физическое лицо": ["Себя", "Другого человека"],
  СМИ: ["Организацию / редакцию"],
  Вуз: ["Организацию (вуз)"],
  Ссуз: ["Организацию (ссуз / колледж)"],
  "Региональное отделение": ["Региональное отделение"],
  Работодатель: ["Организацию-работодателя"],
  "Орган власти": ["Орган исполнительной власти"],
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const F = "var(--font-onest), sans-serif";

const INPUT_BASE: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  background: "#0d0d12",
  border: "1px solid #2a2a32",
  color: "#f2f0ec",
  fontSize: 15,
  fontFamily: F,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.18s",
};

const LABEL: React.CSSProperties = {
  color: "#9a9aa4",
  fontSize: 11,
  fontFamily: F,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: 6,
  display: "block",
};

const HINT: React.CSSProperties = {
  color: "#6a6a72",
  fontSize: 12,
  fontFamily: F,
  marginBottom: 6,
  lineHeight: 1.5,
};

// ─── Small shared components ──────────────────────────────────────────────────

function Req() {
  return <span style={{ color: "#ff6b6b", marginLeft: 2 }}>*</span>;
}

function Divider() {
  return <div style={{ height: 1, background: "#2a2a32" }} />;
}

function DarkSelect({
  value,
  onChange,
  placeholder,
  options,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  accent?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...INPUT_BASE,
          appearance: "none",
          paddingRight: 40,
          color: value ? "#f2f0ec" : "#6a6a72",
          borderColor: value && accent ? accent + "66" : "#2a2a32",
        }}
        onFocus={(e) => {
          if (accent) e.currentTarget.style.borderColor = accent + "99";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = value && accent ? accent + "66" : "#2a2a32";
        }}
      >
        <option value="" disabled style={{ background: "#121216", color: "#6a6a72" }}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} style={{ background: "#121216" }}>
            {o}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#6a6a72",
          pointerEvents: "none",
          fontSize: 12,
        }}
      >
        ▼
      </span>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  maxLen,
  accent,
  type = "text",
  disabled,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLen?: number;
  accent?: string;
  type?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const baseBorder = invalid ? "#ff6b6b" : value && accent ? accent + "66" : "#2a2a32";
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(maxLen ? e.target.value.slice(0, maxLen) : e.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...INPUT_BASE,
          paddingRight: maxLen ? 56 : 16,
          opacity: disabled ? 0.4 : 1,
          borderColor: baseBorder,
        }}
        onFocus={(e) => {
          if (accent) e.currentTarget.style.borderColor = accent + "99";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = baseBorder;
        }}
      />
      {maxLen && (
        <span
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: value.length >= maxLen ? "#ff6b6b" : "#6a6a72",
            fontSize: 11,
            fontFamily: F,
            pointerEvents: "none",
          }}
        >
          {value.length}/{maxLen}
        </span>
      )}
    </div>
  );
}

function LargeTextarea({
  value,
  onChange,
  placeholder,
  maxLen,
  accent,
  hint,
  example,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLen: number;
  accent?: string;
  hint?: string;
  example?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {hint && <p style={HINT}>{hint}</p>}
      {example && (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              background: "none",
              border: 0,
              color: "#0804ff",
              fontSize: 12,
              fontFamily: F,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {open ? "Скрыть пример" : "Показать пример"}
          </button>
          {open && (
            <div
              style={{
                background: "#121216",
                border: "1px solid #2a2a32",
                padding: "12px 14px",
                marginTop: 8,
              }}
            >
              <p
                style={{ color: "#6a6a72", fontSize: 13, fontFamily: F, lineHeight: 1.7 }}
              >
                {example}
              </p>
            </div>
          )}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <textarea
          value={value}
          rows={7}
          onChange={(e) => onChange(e.target.value.slice(0, maxLen))}
          placeholder={placeholder}
          style={{
            ...INPUT_BASE,
            resize: "vertical",
            lineHeight: 1.65,
            paddingBottom: 28,
            borderColor: value && accent ? accent + "66" : "#2a2a32",
          }}
          onFocus={(e) => {
            if (accent) e.currentTarget.style.borderColor = accent + "99";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor =
              value && accent ? accent + "66" : "#2a2a32";
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 12,
            bottom: 10,
            color: value.length >= maxLen ? "#ff6b6b" : "#6a6a72",
            fontSize: 11,
            fontFamily: F,
            pointerEvents: "none",
          }}
        >
          {value.length}/{maxLen}
        </span>
      </div>
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: "transparent",
            border: `1px solid ${value === o ? "#f2f0ec" : "#2a2a32"}`,
            cursor: "pointer",
            transition: "all 0.18s",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: `2px solid ${value === o ? "#f2f0ec" : "#2a2a32"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "border-color 0.18s",
            }}
          >
            {value === o && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#f2f0ec",
                }}
              />
            )}
          </div>
          <span
            style={{
              color: value === o ? "#f2f0ec" : "#9a9aa4",
              fontSize: 14,
              fontFamily: F,
              transition: "color 0.18s",
            }}
          >
            {o}
          </span>
        </button>
      ))}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
      onClick={() => onChange(!checked)}
    >
      <div
        style={{
          width: 18,
          height: 18,
          border: `2px solid ${checked ? "#0804ff" : "#2a2a32"}`,
          background: checked ? "#0804ff" : "transparent",
          flexShrink: 0,
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s",
        }}
      >
        {checked && (
          <span style={{ color: "white", fontSize: 11, lineHeight: 1 }}>✓</span>
        )}
      </div>
      <p style={{ color: "#9a9aa4", fontSize: 13, fontFamily: F, lineHeight: 1.6 }}>
        {children}
      </p>
    </label>
  );
}

function PhotoUpload({
  file,
  onFile,
  accent,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  accent: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const preview = file ? URL.createObjectURL(file) : null;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) onFile(f);
    },
    [onFile],
  );

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${drag ? accent : "#2a2a32"}`,
          padding: "28px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          transition: "border-color 0.2s",
          background: drag ? accent + "08" : "transparent",
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#1a1a22",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            📷
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#f2f0ec", fontSize: 14, fontFamily: F }}>
            {file ? file.name : "Нажмите для загрузки или перетащите файл"}
          </p>
          {!file && (
            <p style={{ color: "#6a6a72", fontSize: 12, fontFamily: F, marginTop: 4 }}>
              JPG, PNG до 10 МБ
            </p>
          )}
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
            }}
            style={{
              background: "none",
              border: 0,
              color: "#ff6b6b",
              fontSize: 12,
              fontFamily: F,
              cursor: "pointer",
            }}
          >
            Удалить фото
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

function LinksInput({
  links,
  onChange,
}: {
  links: string[];
  onChange: (v: string[]) => void;
}) {
  const add = () => {
    if (links.length < 5) onChange([...links, ""]);
  };
  const update = (i: number, v: string) => {
    const a = [...links];
    a[i] = v;
    onChange(a);
  };
  const remove = (i: number) => onChange(links.filter((_, j) => j !== i));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {links.map((link, i) => (
        <div key={i} style={{ display: "flex", gap: 8 }}>
          <input
            type="url"
            value={link}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://"
            style={{ ...INPUT_BASE, flex: 1 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2a2a3299")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            style={{
              width: 44,
              height: 44,
              background: "#121216",
              border: "1px solid #2a2a32",
              color: "#9a9aa4",
              cursor: "pointer",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
      {links.length < 5 && (
        <button
          type="button"
          onClick={add}
          style={{
            background: "none",
            border: "1px dashed #2a2a32",
            color: "#9a9aa4",
            fontSize: 14,
            fontFamily: F,
            padding: "10px 16px",
            cursor: "pointer",
            textAlign: "left",
            transition: "border-color 0.18s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6a6a72")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
        >
          + Добавить ссылку {links.length > 0 && `(${links.length}/5)`}
        </button>
      )}
    </div>
  );
}

function SectionTitle({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <p
        style={{
          color: "#9a9aa4",
          fontSize: 11,
          fontFamily: F,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          marginBottom: 8,
        }}
      >
        {step}
      </p>
      <p
        style={{
          color: "#f2f0ec",
          fontSize: 28,
          fontFamily: F,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "1px",
          lineHeight: 1.2,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            color: "#6a6a72",
            fontSize: 14,
            fontFamily: F,
            lineHeight: 1.6,
            marginTop: 8,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  // Page 0
  nomination: string;
  orgType: string;
  // Page 1 — applicant
  applicantFio: string;
  applicantEmail: string;
  applicantPhone: string;
  nominateSelf: string;
  consentPersonal: boolean;
  consentTerms: boolean;
  consentNewsletter: boolean;
  howKnew: string;
  // Page 2 — nominee
  nomLastName: string;
  nomFirstName: string;
  nomPatronymic: string;
  nomNoPatronymic: boolean;
  nomGender: string;
  nomBirthDate: string;
  nomRegion: string;
  nomPhoto: File | null;
  nomInn: string;
  nomWorkplace: string;
  nomPosition: string;
  descActivity: string;
  descScale: string;
  coverageLevel: string;
  additionalInfo: string;
  links: string[];
};

// ─── Официальные поля номинации (из formSchema) ──────────────────────────────
export type NomField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "url" | "file";
  required?: boolean;
  options?: string[];
};

const NOM_FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png";

/** Динамический рендер официальных полей выбранной номинации. */
function DynamicNominationFields({
  schema,
  values,
  files,
  onValue,
  onFile,
  accent,
  invalidSet,
}: {
  schema: NomField[];
  values: Record<string, string>;
  files: Record<string, File | null>;
  onValue: (name: string, v: string) => void;
  onFile: (name: string, f: File | null) => void;
  accent: string;
  invalidSet: Set<string>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {schema.map((f) => {
        const invalid = invalidSet.has(f.name);
        return (
          <div key={f.name} id={`f-${f.name}`} className={invalid ? "field-invalid" : ""}>
            <label style={LABEL}>
              {f.label} {f.required && <Req />}
            </label>
            {f.type === "textarea" ? (
              <LargeTextarea
                value={values[f.name] ?? ""}
                onChange={(v) => onValue(f.name, v)}
                placeholder="Введите ответ…"
                maxLen={2000}
                accent={accent}
              />
            ) : f.type === "select" ? (
              <DarkSelect
                value={values[f.name] ?? ""}
                onChange={(v) => onValue(f.name, v)}
                placeholder="Выберите значение"
                options={f.options ?? []}
                accent={accent}
              />
            ) : f.type === "file" ? (
              <div>
                <input
                  type="file"
                  accept={NOM_FILE_ACCEPT}
                  onChange={(e) => onFile(f.name, e.target.files?.[0] ?? null)}
                  style={{ color: "#9a9aa4", fontFamily: F, fontSize: 13 }}
                />
                {files[f.name] && (
                  <span style={{ color: "#2fbf6b", fontSize: 12, fontFamily: F, marginLeft: 8 }}>
                    {files[f.name]!.name}
                  </span>
                )}
              </div>
            ) : (
              <TextInput
                value={values[f.name] ?? ""}
                onChange={(v) => onValue(f.name, v)}
                placeholder={f.type === "url" ? "https://…" : f.type === "number" ? "0" : ""}
                type={f.type === "number" ? "number" : "text"}
                accent={accent}
                invalid={invalid}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const DRAFT_KEY = "trudkrut-apply-draft-v1";

const INITIAL: FormState = {
  nomination: "",
  orgType: "",
  applicantFio: "",
  applicantEmail: "",
  applicantPhone: "",
  nominateSelf: "",
  consentPersonal: false,
  consentTerms: false,
  consentNewsletter: false,
  howKnew: "",
  nomLastName: "",
  nomFirstName: "",
  nomPatronymic: "",
  nomNoPatronymic: false,
  nomGender: "",
  nomBirthDate: "",
  nomRegion: "",
  nomPhoto: null,
  nomInn: "",
  nomWorkplace: "",
  nomPosition: "",
  descActivity: "",
  descScale: "",
  coverageLevel: "",
  additionalInfo: "",
  links: [],
};

// ─── Поиск организации по ИНН (DaData) ────────────────────────────────────────

function InnLookup({
  inn,
  accent,
  onInn,
  onResolved,
}: {
  inn: string;
  accent: string;
  onInn: (v: string) => void;
  onResolved: (name: string) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [error, setError] = useState("");
  const [addr, setAddr] = useState("");

  async function run() {
    const digits = inn.replace(/\D/g, "");
    if (digits.length !== 10 && digits.length !== 12) {
      setError("ИНН должен содержать 10 или 12 цифр");
      setState("error");
      onResolved("");
      return;
    }
    setState("loading");
    setError("");
    const res = await lookupInn(digits);
    if (res.ok) {
      onResolved(res.org.name);
      setAddr(res.org.address);
      setState("found");
    } else {
      onResolved("");
      setAddr("");
      setError(res.error);
      setState("error");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={inn}
          inputMode="numeric"
          placeholder="ИНН организации (10 или 12 цифр)"
          onChange={(e) => {
            onInn(e.target.value.replace(/\D/g, "").slice(0, 12));
            setState("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              run();
            }
          }}
          onBlur={() => {
            const d = inn.replace(/\D/g, "");
            if ((d.length === 10 || d.length === 12) && state === "idle") run();
          }}
          style={{
            ...INPUT_BASE,
            borderColor: inn && accent ? accent + "66" : "#2a2a32",
          }}
        />
        <button
          type="button"
          onClick={run}
          disabled={state === "loading"}
          style={{
            flexShrink: 0,
            background: accent,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0 22px",
            fontSize: 14,
            fontFamily: F,
            fontWeight: 600,
            cursor: state === "loading" ? "default" : "pointer",
            opacity: state === "loading" ? 0.6 : 1,
          }}
        >
          {state === "loading" ? "…" : "Найти"}
        </button>
      </div>

      {state === "found" && (
        <div
          style={{
            marginTop: 10,
            background: "rgba(8,4,255,0.08)",
            border: `1px solid ${accent}44`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 13,
              fontFamily: F,
              fontWeight: 600,
              margin: 0,
            }}
          >
            ✓ Организация найдена — проверьте название ниже
          </p>
          {addr && (
            <p
              style={{ color: "#9a9aa4", fontSize: 12, fontFamily: F, margin: "4px 0 0" }}
            >
              {addr}
            </p>
          )}
        </div>
      )}
      {state === "error" && (
        <p style={{ color: "#ff6b6b", fontSize: 13, fontFamily: F, marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Приводит ввод к маске +7 (900) 000-00-00, отбрасывая всё лишнее. */
function formatPhoneRu(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d[0] === "8") d = "7" + d.slice(1);
  if (d[0] !== "7") d = "7" + d;
  d = d.slice(0, 11);
  const p = d.slice(1); // до 10 цифр после «7»
  let out = "+7";
  if (p.length > 0) out += " (" + p.slice(0, 3);
  if (p.length >= 3) out += ")";
  if (p.length > 3) out += " " + p.slice(3, 6);
  if (p.length > 6) out += "-" + p.slice(6, 8);
  if (p.length > 8) out += "-" + p.slice(8, 10);
  return out;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApplyFlow({ schemas = {} }: { schemas?: Record<string, NomField[]> }) {
  const router = useRouter();
  const nominationId: string | undefined = undefined;
  const [page, setPage] = useState(nominationId ? 1 : 0);
  const [submitted, setSubmitted] = useState(false);
  // Значения и файлы динамических полей номинации (шаг «Данные по номинации»).
  const [dyn, setDyn] = useState<Record<string, string>>({});
  const [dynFiles, setDynFiles] = useState<Record<string, File | null>>({});
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    nomination: nominationId || "",
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Черновик в localStorage (без фото и согласий — их нельзя/не следует хранить) ──
  const [draftFound, setDraftFound] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftLoaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormState>;
        // черновик значим, если что-то заполнено
        const meaningful =
          saved.nomination || saved.applicantFio || saved.nomLastName;
        if (meaningful) setDraftFound(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // автосохранение (дебаунс) — пока заявка не отправлена
  useEffect(() => {
    if (submitted) return;
    const hasContent =
      form.nomination || form.applicantFio || form.nomLastName || form.descActivity;
    if (!hasContent) return;
    const t = setTimeout(() => {
      try {
        const {
          nomPhoto: _p,
          consentPersonal: _c1,
          consentTerms: _c2,
          consentNewsletter: _c3,
          ...rest
        } = form;
        void _p;
        void _c1;
        void _c2;
        void _c3;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...rest, _page: page }));
        setDraftSaved(true);
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form, page, submitted]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormState> & { _page?: number };
        const { _page, ...fields } = saved;
        setForm((f) => ({ ...f, ...fields, nomPhoto: null }));
        if (typeof _page === "number") setPage(Math.max(0, Math.min(2, _page)));
      }
    } catch {
      /* ignore */
    }
    draftLoaded.current = true;
    setDraftFound(false);
  };

  const dismissDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraftFound(false);
  };

  const selectedNom = NOMINATIONS.find((n) => n.id === form.nomination);
  const accent = selectedNom?.accent || "#0804ff";
  // Официальные поля выбранной номинации; если заданы — шаг 2 рендерится из них.
  const schema: NomField[] = (selectedNom && schemas[selectedNom.title]) || [];
  const useDynamic = schema.length > 0;
  const dynVal = (name: string) => (dyn[name] ?? "").trim();
  const missingDyn = (): string[] =>
    schema
      .filter((f) => f.required && (f.type === "file" ? !dynFiles[f.name] : !dynVal(f.name)))
      .map((f) => f.name);
  const allowedTypes = form.nomination
    ? (ELIGIBILITY[form.nomination] ?? [])
    : [...ORG_TYPES];
  const nominateOptions = form.orgType
    ? (NOMINATE_OPTIONS[form.orgType] ?? ["Организацию"])
    : [];

  const p0Valid = !!form.nomination && !!form.orgType;

  const emailFormatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.applicantEmail);
  const emailPolicyOk = emailFormatOk && isEmailAllowed(form.applicantEmail);

  const p1Valid =
    !!form.applicantFio &&
    emailPolicyOk &&
    !!form.nominateSelf &&
    !!form.howKnew &&
    form.consentPersonal &&
    form.consentTerms;

  const p2Valid = useDynamic
    ? missingDyn().length === 0
    : !!form.nomLastName &&
      !!form.nomFirstName &&
      (form.nomNoPatronymic || !!form.nomPatronymic) &&
      !!form.nomGender &&
      !!form.nomBirthDate &&
      !!form.nomRegion &&
      !!form.nomPhoto &&
      !!form.nomWorkplace &&
      !!form.nomPosition &&
      !!form.descActivity &&
      !!form.descScale &&
      !!form.coverageLevel;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  // Подсветка незаполненных обязательных полей (после попытки «Далее»/«Отправить»).
  const [triedNext, setTriedNext] = useState(false);
  useEffect(() => {
    setTriedNext(false);
  }, [page]);

  const missingP1 = (): string[] => {
    const m: string[] = [];
    if (!form.applicantFio) m.push("applicantFio");
    if (!emailPolicyOk) m.push("applicantEmail");
    if (!form.nominateSelf) m.push("nominateSelf");
    if (!form.howKnew) m.push("howKnew");
    if (!form.consentPersonal) m.push("consentPersonal");
    if (!form.consentTerms) m.push("consentTerms");
    return m;
  };
  const missingP2 = (): string[] => {
    if (useDynamic) return missingDyn();
    const m: string[] = [];
    if (!form.nomLastName) m.push("nomLastName");
    if (!form.nomFirstName) m.push("nomFirstName");
    if (!(form.nomNoPatronymic || form.nomPatronymic)) m.push("nomPatronymic");
    if (!form.nomGender) m.push("nomGender");
    if (!form.nomBirthDate) m.push("nomBirthDate");
    if (!form.nomRegion) m.push("nomRegion");
    if (!form.nomPhoto) m.push("nomPhoto");
    if (!form.nomWorkplace) m.push("nomWorkplace");
    if (!form.nomPosition) m.push("nomPosition");
    if (!form.descActivity) m.push("descActivity");
    if (!form.descScale) m.push("descScale");
    if (!form.coverageLevel) m.push("coverageLevel");
    return m;
  };

  const scrollToField = (key: string) => {
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document
        .getElementById(`f-${key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  /** Класс подсветки: краснеет только после попытки и пока поле пустое. */
  const inv = (empty: boolean) => (triedNext && empty ? "field-invalid" : "");

  // ── Живой счётчик заполнения по шагам ──
  const P1_TOTAL = 6;
  const P2_TOTAL = useDynamic ? schema.filter((f) => f.required).length : 12;
  const p1Filled = P1_TOTAL - missingP1().length;
  const p2Filled = P2_TOTAL - missingP2().length;

  /** Прогресс-бар шага: сколько обязательных полей заполнено. */
  const StepMeter = ({ filled, total }: { filled: number; total: number }) => {
    const pct = Math.round((filled / total) * 100);
    const done = filled >= total;
    return (
      <div style={{ margin: "-16px 0 32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "#9a9aa4", fontSize: 12.5, fontFamily: F, fontWeight: 600 }}>
            {done
              ? "Все обязательные поля заполнены"
              : `Заполнено ${filled} из ${total} обязательных полей`}
          </span>
          <span
            style={{
              color: done ? "#2fbf6b" : "#9a9aa4",
              fontSize: 12.5,
              fontFamily: F,
              fontWeight: 700,
            }}
          >
            {done ? "✓ 100%" : `${pct}%`}
          </span>
        </div>
        <div style={{ height: 4, background: "#1e1e24", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: done ? "#2fbf6b" : accent,
              borderRadius: 999,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    );
  };

  // ── Скролл к началу шага при переходе (кроме первого рендера) ──
  const firstPageRender = useRef(true);
  useEffect(() => {
    if (firstPageRender.current) {
      firstPageRender.current = false;
      return;
    }
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
      document
        .getElementById(`apply-page-${page}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [page]);

  // ── Предупреждение при закрытии вкладки с незавершённой заявкой ──
  useEffect(() => {
    const hasContent = !!(
      form.nomination ||
      form.applicantFio ||
      form.nomLastName ||
      form.descActivity
    );
    if (!hasContent || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.nomination, form.applicantFio, form.nomLastName, form.descActivity, submitted]);

  // Клик «Далее → Номинант»: если чего-то не хватает — подсветить и проскроллить.
  const goToNominee = () => {
    const m = missingP1();
    if (m.length === 0) {
      setPage(2);
      return;
    }
    setTriedNext(true);
    scrollToField(m[0]);
  };

  // Реальная отправка заявки в БД (server action). Поля макета → Application.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const miss = missingP2();
    if (miss.length > 0) {
      setTriedNext(true);
      setSubmitError("Заполните выделенные обязательные поля.");
      scrollToField(miss[0]);
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setSubmitError("Пройдите проверку «я не робот».");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData();
    fd.set("nominationTitle", selectedNom?.title ?? "");
    fd.set("participantType", form.orgType);
    fd.set("applicantFio", form.applicantFio);
    fd.set("email", form.applicantEmail);
    fd.set("phone", form.applicantPhone);
    fd.set("nominateSelf", form.nominateSelf);
    fd.set("howKnew", form.howKnew);
    fd.set("links", form.links.join("\n"));
    fd.set("consentNewsletter", String(form.consentNewsletter));
    fd.set("smart-token", captchaToken);
    if (useDynamic) {
      fd.set("dynamic", "1");
      for (const f of schema) {
        if (f.type === "file") {
          const file = dynFiles[f.name];
          if (file) fd.set(`f_${f.name}`, file);
        } else {
          fd.set(`f_${f.name}`, dyn[f.name] ?? "");
        }
      }
    } else {
      fd.set("lastName", form.nomLastName);
      fd.set("firstName", form.nomFirstName);
      fd.set("patronymic", form.nomPatronymic);
      fd.set("noPatronymic", String(form.nomNoPatronymic));
      fd.set("gender", form.nomGender);
      fd.set("birthDate", form.nomBirthDate);
      fd.set("region", form.nomRegion);
      fd.set("inn", form.nomInn);
      fd.set("workplace", form.nomWorkplace);
      fd.set("position", form.nomPosition);
      fd.set("descActivity", form.descActivity);
      fd.set("descScale", form.descScale);
      fd.set("coverageLevel", form.coverageLevel);
      fd.set("additionalInfo", form.additionalInfo);
      if (form.nomPhoto) fd.set("photo", form.nomPhoto);
    }
    try {
      const res = await submitNomineeApplication(fd);
      if (res.ok) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
        setSubmitted(true);
      }
      else setSubmitError(res.error || "Не удалось отправить заявку");
    } catch {
      setSubmitError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  const PAGES = ["Номинация", "Заявитель", "Номинант"];

  const navBtn = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#2a2a32" : accent,
        color: "white",
        fontSize: 15,
        fontFamily: F,
        fontWeight: 500,
        padding: "14px 32px",
        border: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 999,
        opacity: disabled ? 0.4 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {label}
    </button>
  );

  const backBtn = (toPage: number) => (
    <button
      type="button"
      onClick={() => setPage(toPage)}
      style={{
        background: "#121216",
        color: "#9a9aa4",
        fontSize: 15,
        fontFamily: F,
        fontWeight: 500,
        padding: "14px 28px",
        border: "1px solid #2a2a32",
        cursor: "pointer",
        borderRadius: 999,
      }}
    >
      ← Назад
    </button>
  );

  return (
    <div
      style={{
        background: "#08080a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        className="apply-topbar"
        style={{
          background: "#08080a",
          borderBottom: "1px solid #2a2a32",
          padding: "18px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "transparent",
            border: 0,
            color: "#9a9aa4",
            fontSize: 14,
            fontFamily: F,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f2f0ec")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9a9aa4")}
        >
          ← <span className="apply-back-text">На сайт</span>
        </button>

        {/* Progress steps — completed ones are clickable */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {PAGES.map((label, i) => {
            const done = page > i;
            const active = page === i;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => done && setPage(i)}
                  disabled={!done}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: done ? "pointer" : "default",
                  }}
                  title={done ? `Вернуться: ${label}` : undefined}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: done ? "#0804ff" : "transparent",
                      border: `2px solid ${done ? "#0804ff" : active ? "#f2f0ec" : "#2a2a32"}`,
                      color: done ? "white" : active ? "#f2f0ec" : "#6a6a72",
                      fontSize: 12,
                      fontFamily: F,
                      fontWeight: 700,
                      transition: "all 0.3s",
                      ...(done ? { boxShadow: "0 0 0 0px #0804ff44" } : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (done)
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 0 0 4px #0804ff33";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className="apply-step-label"
                    style={{
                      color: active ? "#f2f0ec" : done ? "#9a9aa4" : "#6a6a72",
                      fontSize: 11,
                      fontFamily: F,
                      fontWeight: active ? 600 : 400,
                      textDecoration: done ? "underline" : "none",
                      textUnderlineOffset: 2,
                    }}
                  >
                    {label}
                  </span>
                </button>
                {i < PAGES.length - 1 && (
                  <div
                    style={{
                      width: 48,
                      height: 1,
                      background: page > i ? "#0804ff" : "#2a2a32",
                      margin: "0 8px",
                      marginBottom: 18,
                      transition: "background 0.3s",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="apply-spacer" style={{ width: 80 }} />
      </div>

      {draftSaved && !submitted && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#0f1614",
            border: "1px solid #1f7a4d55",
            color: "#4cd08a",
            fontSize: 12.5,
            fontFamily: F,
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        >
          ✓ Черновик сохранён
        </div>
      )}

      {draftFound && !submitted && (
        <div
          style={{
            maxWidth: 720,
            margin: "20px auto 0",
            padding: "14px 18px",
            width: "calc(100% - 96px)",
            boxSizing: "border-box",
            background: "#0f0f18",
            border: "1px solid #0804ff55",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#c8c8d0", fontSize: 14, fontFamily: F }}>
            Найден незаконченный черновик заявки. Продолжить заполнение?
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={restoreDraft}
              style={{
                background: "#0804ff",
                color: "#fff",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 600,
                border: 0,
                borderRadius: 999,
                padding: "9px 18px",
                cursor: "pointer",
              }}
            >
              Восстановить
            </button>
            <button
              type="button"
              onClick={dismissDraft}
              style={{
                background: "transparent",
                color: "#9a9aa4",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 600,
                border: "1px solid #2a2a32",
                borderRadius: 999,
                padding: "9px 18px",
                cursor: "pointer",
              }}
            >
              Начать заново
            </button>
          </div>
        </div>
      )}

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            padding: "80px 48px",
            textAlign: "center",
          }}
        >
          <Confetti />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              color: "white",
            }}
          >
            ✓
          </motion.div>
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 36,
              fontFamily: F,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Заявка отправлена
          </p>
          <p
            style={{
              color: "#9a9aa4",
              fontSize: 16,
              fontFamily: F,
              lineHeight: 1.7,
              maxWidth: 460,
            }}
          >
            Оргкомитет рассмотрит вашу заявку и свяжется в течение 3 рабочих дней.
          </p>
          {selectedNom && (
            <div
              style={{
                border: `1px solid ${accent}55`,
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                textAlign: "left",
                maxWidth: 460,
                width: "100%",
              }}
            >
              <p
                style={{
                  color: "#9a9aa4",
                  fontSize: 11,
                  fontFamily: F,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.72px",
                }}
              >
                Номинация
              </p>
              <p style={{ color: accent, fontSize: 17, fontFamily: F, fontWeight: 700 }}>
                {selectedNom.id} — {selectedNom.title}
              </p>
            </div>
          )}

          <div style={{ width: "100%", maxWidth: 460 }}>
            <p
              style={{
                color: "#c8c8d0",
                fontSize: 15,
                fontFamily: F,
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              Расскажи, что участвуешь — сохрани картинку и выложи в сторис 👇
            </p>
            <ShareBrickCard
              headline="Я подал заявку"
              nomination={selectedNom?.title}
            />
          </div>

          <button
            onClick={() => router.push("/")}
            style={{
              background: "#0804ff",
              color: "white",
              fontSize: 15,
              fontFamily: F,
              fontWeight: 500,
              padding: "14px 36px",
              border: 0,
              borderRadius: 999,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            На главную
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {/* ── PAGE 0: Nomination + Category ────────────────────────────── */}
          {page === 0 && (
            <motion.div
              key="p0"
              id="apply-page-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 48px",
                scrollMarginTop: 80,
              }}
            >
              <div style={{ width: "100%", maxWidth: 560 }}>
                <p
                  style={{
                    color: "#f2f0ec",
                    fontSize: 36,
                    fontFamily: F,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    marginBottom: 48,
                    textAlign: "center",
                  }}
                >
                  Подать заявку
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div>
                    <label style={LABEL}>Номинация</label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={form.nomination}
                        onChange={(e) => {
                          const id = e.target.value;
                          const types = ELIGIBILITY[id] ?? [];
                          set("nomination", id);
                          set(
                            "orgType",
                            types.length === 1
                              ? types[0]
                              : types.includes(form.orgType as OrgType)
                                ? form.orgType
                                : "",
                          );
                        }}
                        style={{
                          ...INPUT_BASE,
                          appearance: "none",
                          paddingRight: 40,
                          color: form.nomination ? "#f2f0ec" : "#6a6a72",
                          borderColor: form.nomination ? accent + "66" : "#2a2a32",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = accent + "99")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = form.nomination
                            ? accent + "66"
                            : "#2a2a32")
                        }
                      >
                        <option
                          value=""
                          disabled
                          style={{ background: "#121216", color: "#6a6a72" }}
                        >
                          Выберите вариант
                        </option>
                        {NOMINATIONS.map((n) => (
                          <option
                            key={n.id}
                            value={n.id}
                            style={{ background: "#121216" }}
                          >
                            {n.id} — {n.title}
                          </option>
                        ))}
                      </select>
                      <span
                        style={{
                          position: "absolute",
                          right: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6a6a72",
                          pointerEvents: "none",
                          fontSize: 12,
                        }}
                      >
                        ▼
                      </span>
                    </div>
                  </div>
                  {/* Show category only if multiple options */}
                  {form.nomination && allowedTypes.length > 1 && (
                    <div>
                      <label style={LABEL}>Категория</label>
                      <DarkSelect
                        value={form.orgType}
                        onChange={(v) => set("orgType", v)}
                        placeholder="Выберите вариант"
                        options={allowedTypes as unknown as string[]}
                        accent={accent}
                      />
                    </div>
                  )}
                  {/* Show selected category as badge when auto-selected */}
                  {form.nomination && allowedTypes.length === 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        background: accent + "11",
                        border: `1px solid ${accent}33`,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: accent,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: "#9a9aa4", fontSize: 12, fontFamily: F }}>
                        Категория:
                      </span>
                      <span
                        style={{
                          color: accent,
                          fontSize: 13,
                          fontFamily: F,
                          fontWeight: 600,
                        }}
                      >
                        {allowedTypes[0]}
                      </span>
                    </motion.div>
                  )}
                  <button
                    type="button"
                    disabled={!p0Valid}
                    onClick={() => p0Valid && setPage(1)}
                    style={{
                      width: "100%",
                      background: p0Valid ? accent : "#2a2a32",
                      color: "white",
                      fontSize: 16,
                      fontFamily: F,
                      fontWeight: 600,
                      padding: "16px",
                      border: 0,
                      borderRadius: 999,
                      cursor: p0Valid ? "pointer" : "not-allowed",
                      opacity: p0Valid ? 1 : 0.5,
                      transition: "all 0.2s",
                      marginTop: 8,
                    }}
                  >
                    Заполнить заявку →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PAGE 1: Информация о заявителе ───────────────────────────── */}
          {page === 1 && (
            <motion.div
              key="p1"
              id="apply-page-1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                padding: "56px 48px",
                scrollMarginTop: 80,
              }}
            >
              <div style={{ width: "100%", maxWidth: 680 }}>
                <SectionTitle step="Шаг 1" title="Информация о заявителе" />
                <StepMeter filled={p1Filled} total={P1_TOTAL} />
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <div
                      id="f-applicantFio"
                      className={inv(!form.applicantFio)}
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <label style={LABEL}>
                        ФИО заявителя <Req />
                      </label>
                      <TextInput
                        value={form.applicantFio}
                        onChange={(v) => set("applicantFio", v)}
                        placeholder="Иванов Иван Иванович"
                        maxLen={100}
                        accent={accent}
                      />
                    </div>
                    <div id="f-applicantEmail" className={inv(!emailPolicyOk)}>
                      <label style={LABEL}>
                        Email <Req />
                      </label>
                      <TextInput
                        value={form.applicantEmail}
                        onChange={(v) => set("applicantEmail", v)}
                        placeholder="you@example.ru"
                        maxLen={100}
                        accent={accent}
                      />
                      <p
                        style={{
                          color:
                            form.applicantEmail && emailFormatOk && !emailPolicyOk
                              ? "#ff6b6b"
                              : "#6a6a72",
                          fontSize: 12.5,
                          fontFamily: F,
                          margin: "6px 0 0",
                          lineHeight: 1.4,
                        }}
                      >
                        {form.applicantEmail && emailFormatOk && !emailPolicyOk
                          ? checkEmailPolicy(form.applicantEmail).reason
                          : "Только российские или корпоративные адреса (Gmail, Outlook и т.п. не подходят)."}
                      </p>
                    </div>
                    <div>
                      <label style={LABEL}>Телефон</label>
                      <TextInput
                        value={form.applicantPhone}
                        onChange={(v) => set("applicantPhone", formatPhoneRu(v))}
                        placeholder="+7 (900) 000-00-00"
                        maxLen={18}
                        accent={accent}
                      />
                    </div>
                    <p
                      style={{
                        gridColumn: "1 / -1",
                        color: "#6a6a72",
                        fontSize: 12,
                        fontFamily: "var(--font-onest), sans-serif",
                        margin: 0,
                      }}
                    >
                      На этот email придут уведомления о статусе заявки.
                    </p>
                  </div>

                  <Divider />

                  <div id="f-nominateSelf" className={inv(!form.nominateSelf)}>
                    <label style={LABEL}>
                      Кого Вы номинируете? <Req />
                    </label>
                    <DarkSelect
                      value={form.nominateSelf}
                      onChange={(v) => set("nominateSelf", v)}
                      placeholder="Выберите один из предложенных вариантов"
                      options={nominateOptions}
                      accent={accent}
                    />
                  </div>

                  <Divider />

                  <div id="f-howKnew" className={inv(!form.howKnew)}>
                    <label style={LABEL}>
                      Откуда вы узнали о Премии? <Req />
                    </label>
                    <DarkSelect
                      value={form.howKnew}
                      onChange={(v) => set("howKnew", v)}
                      placeholder="Выберите один из предложенных вариантов"
                      options={HOW_KNEW}
                      accent={accent}
                    />
                  </div>

                  <Divider />

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div id="f-consentPersonal" className={inv(!form.consentPersonal)}>
                      <Checkbox
                        checked={form.consentPersonal}
                        onChange={(v) => set("consentPersonal", v)}
                      >
                        Я даю согласие на обработку персональных данных с целью участия в
                        Конкурсе и/или обеспечения участия лица, мною заявляемого.{" "}
                        <span style={{ color: "#ff6b6b" }}>*</span>
                      </Checkbox>
                    </div>
                    <div id="f-consentTerms" className={inv(!form.consentTerms)}>
                      <Checkbox
                        checked={form.consentTerms}
                        onChange={(v) => set("consentTerms", v)}
                      >
                        Подтверждаю, что ознакомлен и принимаю условия Положения о Конкурсе,
                        Политики обработки персональных данных, Пользовательского
                        соглашения. <span style={{ color: "#ff6b6b" }}>*</span>
                      </Checkbox>
                    </div>
                    <Checkbox
                      checked={form.consentNewsletter}
                      onChange={(v) => set("consentNewsletter", v)}
                    >
                      Я согласен на получение рассылки рекламного, информационного
                      характера от организаторов Национальной премии «Труд крут».
                    </Checkbox>
                  </div>

                  <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                    {backBtn(0)}
                    {navBtn("Далее → Номинант", goToNominee)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PAGE 2: Информация о номинанте ───────────────────────────── */}
          {page === 2 && (
            <motion.div
              key="p2"
              id="apply-page-2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                padding: "56px 48px",
                scrollMarginTop: 80,
              }}
            >
              <div style={{ width: "100%", maxWidth: 680 }}>
                <SectionTitle
                  step="Шаг 2"
                  title={useDynamic ? "Данные по номинации" : "Информация о номинанте"}
                />
                <StepMeter filled={p2Filled} total={P2_TOTAL} />
                <form
                  onSubmit={handleSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: 24 }}
                >
                  {useDynamic ? (
                    <DynamicNominationFields
                      schema={schema}
                      values={dyn}
                      files={dynFiles}
                      onValue={(n, v) => setDyn((p) => ({ ...p, [n]: v }))}
                      onFile={(n, f) => setDynFiles((p) => ({ ...p, [n]: f }))}
                      accent={accent}
                      invalidSet={new Set(triedNext ? missingP2() : [])}
                    />
                  ) : (
                  <>
                  {/* ФИО */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <div id="f-nomLastName" className={inv(!form.nomLastName)}>
                      <label style={LABEL}>
                        Фамилия <Req />
                      </label>
                      <TextInput
                        value={form.nomLastName}
                        onChange={(v) => set("nomLastName", v)}
                        placeholder="Яковлев"
                        maxLen={50}
                        accent={accent}
                      />
                    </div>
                    <div id="f-nomFirstName" className={inv(!form.nomFirstName)}>
                      <label style={LABEL}>
                        Имя <Req />
                      </label>
                      <TextInput
                        value={form.nomFirstName}
                        onChange={(v) => set("nomFirstName", v)}
                        placeholder="Артём"
                        maxLen={50}
                        accent={accent}
                      />
                    </div>
                  </div>
                  <div
                    id="f-nomPatronymic"
                    className={inv(!(form.nomNoPatronymic || form.nomPatronymic))}
                  >
                    <label style={LABEL}>Отчество</label>
                    <TextInput
                      value={form.nomPatronymic}
                      onChange={(v) => set("nomPatronymic", v)}
                      placeholder="Сергеевич"
                      maxLen={50}
                      accent={accent}
                      disabled={form.nomNoPatronymic}
                    />
                    <div style={{ marginTop: 10 }}>
                      <Checkbox
                        checked={form.nomNoPatronymic}
                        onChange={(v) => {
                          set("nomNoPatronymic", v);
                          if (v) set("nomPatronymic", "");
                        }}
                      >
                        Нет отчества — поле «Отчество» обязательно для заполнения, если в
                        документе, удостоверяющем личность пользователя, отчество
                        присутствует
                      </Checkbox>
                    </div>
                  </div>

                  <Divider />

                  {/* Пол */}
                  <div id="f-nomGender" className={inv(!form.nomGender)}>
                    <label style={LABEL}>
                      Пол <Req />
                    </label>
                    <p style={HINT}>Выберите 1 вариант</p>
                    <RadioGroup
                      options={["Мужской", "Женский"]}
                      value={form.nomGender}
                      onChange={(v) => set("nomGender", v)}
                    />
                  </div>

                  {/* Дата рождения */}
                  <div id="f-nomBirthDate" className={inv(!form.nomBirthDate)}>
                    <label style={LABEL}>
                      Дата рождения <Req />
                    </label>
                    <p style={HINT}>Используйте формат ДД.ММ.ГГГГ</p>
                    <input
                      type="date"
                      value={form.nomBirthDate}
                      onChange={(e) => set("nomBirthDate", e.target.value)}
                      style={{
                        ...INPUT_BASE,
                        borderColor: form.nomBirthDate ? accent + "66" : "#2a2a32",
                        colorScheme: "dark",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = accent + "99")}
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = form.nomBirthDate
                          ? accent + "66"
                          : "#2a2a32")
                      }
                    />
                  </div>

                  {/* Регион */}
                  <div id="f-nomRegion" className={inv(!form.nomRegion)}>
                    <label style={LABEL}>
                      Регион проживания <Req />
                    </label>
                    <DarkSelect
                      value={form.nomRegion}
                      onChange={(v) => set("nomRegion", v)}
                      placeholder="Выберите один из предложенных вариантов"
                      options={REGIONS}
                      accent={accent}
                    />
                  </div>

                  <Divider />

                  {/* Фото */}
                  <div id="f-nomPhoto" className={inv(!form.nomPhoto)}>
                    <label style={LABEL}>
                      Портретное фото <Req />
                    </label>
                    <p style={HINT}>
                      Загрузите портретное фото номинанта (JPG или PNG, до 10 МБ). Фото
                      должно быть чётким, на нейтральном фоне.
                    </p>
                    <PhotoUpload
                      file={form.nomPhoto}
                      onFile={(f) => set("nomPhoto", f)}
                      accent={accent}
                    />
                  </div>

                  <Divider />

                  {/* Место работы — поиск по ИНН */}
                  <div id="f-nomWorkplace" className={inv(!form.nomWorkplace)}>
                    <label style={LABEL}>
                      Место работы (образовательная организация) <Req />
                    </label>
                    <p style={HINT}>
                      Введите ИНН — название подтянется автоматически (или впишите вручную)
                    </p>
                    <InnLookup
                      inn={form.nomInn}
                      accent={accent}
                      onInn={(v) => set("nomInn", v)}
                      onResolved={(name) => set("nomWorkplace", name)}
                    />
                    <div style={{ marginTop: 12 }}>
                      <TextInput
                        value={form.nomWorkplace}
                        onChange={(v) => set("nomWorkplace", v)}
                        placeholder="Название организации"
                        maxLen={200}
                        accent={accent}
                      />
                    </div>
                  </div>

                  {/* Должность */}
                  <div id="f-nomPosition" className={inv(!form.nomPosition)}>
                    <label style={LABEL}>
                      Должность <Req />
                    </label>
                    <TextInput
                      value={form.nomPosition}
                      onChange={(v) => set("nomPosition", v)}
                      placeholder="Командир студенческого отряда"
                      maxLen={100}
                      accent={accent}
                    />
                  </div>

                  <Divider />

                  {/* Описание деятельности */}
                  <div id="f-descActivity" className={inv(!form.descActivity)}>
                    <label style={LABEL}>
                      Описание просветительской деятельности за 2025–2026 гг. <Req />
                    </label>
                    <LargeTextarea
                      value={form.descActivity}
                      onChange={(v) => set("descActivity", v)}
                      placeholder="Опишите основные направления и форматы деятельности..."
                      maxLen={1200}
                      accent={accent}
                      hint="Укажите конкретные проекты, мероприятия и их результаты."
                      example="Пример: В течение 2025–2026 учебного года боец отряда провёл 24 лекции и мастер-класса в 6 школах Саратовской области. Охвачено более 800 учеников. Разработана авторская программа «Наука рядом» для учащихся 8–10 классов. Выступал на региональной конференции РСО как спикер."
                    />
                  </div>

                  {/* Масштаб */}
                  <div id="f-descScale" className={inv(!form.descScale)}>
                    <label style={LABEL}>
                      Масштаб и охват просветительской деятельности за 2025–2026 гг.{" "}
                      <Req />
                    </label>
                    <LargeTextarea
                      value={form.descScale}
                      onChange={(v) => set("descScale", v)}
                      placeholder="Опишите географию, количество участников, охват аудитории..."
                      maxLen={1200}
                      accent={accent}
                      hint="Укажите количественные показатели: число мероприятий, участников, регионов охвата."
                      example="Пример: Деятельность охватила 3 муниципальных района Саратовской области. Проведено 24 мероприятия с общим охватом 820+ участников. Материалы опубликованы в региональных СМИ (5 публикаций). Видеозаписи лекций набрали 12 000+ просмотров ВКонтакте."
                    />
                  </div>

                  {/* Уровень охвата */}
                  <div id="f-coverageLevel" className={inv(!form.coverageLevel)}>
                    <label style={LABEL}>
                      Уровень охвата деятельности <Req />
                    </label>
                    <DarkSelect
                      value={form.coverageLevel}
                      onChange={(v) => set("coverageLevel", v)}
                      placeholder="Выберите один из предложенных вариантов"
                      options={COVERAGE_LEVELS}
                      accent={accent}
                    />
                  </div>

                  <Divider />

                  {/* Доп. инфо */}
                  <div>
                    <label style={LABEL}>Дополнительная информация (при наличии)</label>
                    <LargeTextarea
                      value={form.additionalInfo}
                      onChange={(v) => set("additionalInfo", v)}
                      placeholder="Награды, публикации, особые достижения..."
                      maxLen={200}
                      accent={accent}
                      hint="Любые дополнительные сведения, которые помогут оценить кандидата."
                    />
                  </div>

                  {/* Ссылки */}
                  <div>
                    <label style={LABEL}>
                      Ссылки на социальные сети / новости / сайты (не более 5)
                    </label>
                    <p style={HINT}>
                      Добавьте ссылки на публикации, видео, профили в соцсетях или другие
                      материалы, подтверждающие деятельность.
                    </p>
                    <LinksInput links={form.links} onChange={(v) => set("links", v)} />
                  </div>
                  </>
                  )}

                  <Divider />

                  {/* Предпросмотр заявки перед отправкой */}
                  <div
                    style={{
                      background: "#0e0e12",
                      border: "1px solid #1e1e24",
                      borderRadius: 12,
                      padding: "16px 18px",
                      marginBottom: 4,
                    }}
                  >
                    <p style={{ color: "#c8c8d0", fontSize: 14, fontWeight: 700, margin: "0 0 12px", fontFamily: F }}>
                      Проверьте данные перед отправкой
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(
                        useDynamic
                          ? ([
                              ["Номинация", selectedNom?.title ?? ""],
                              ["Заявитель", form.applicantFio],
                              ["Email / телефон", [form.applicantEmail, form.applicantPhone].filter(Boolean).join(" · ")],
                              ...schema.map(
                                (f) =>
                                  [
                                    f.label.length > 42 ? f.label.slice(0, 42) + "…" : f.label,
                                    f.type === "file"
                                      ? (dynFiles[f.name]?.name ?? "")
                                      : (dyn[f.name] ?? ""),
                                  ] as [string, string],
                              ),
                            ] as [string, string][])
                          : ([
                              ["Номинация", selectedNom?.title ?? ""],
                              ["Заявитель", form.applicantFio],
                              ["Email / телефон", [form.applicantEmail, form.applicantPhone].filter(Boolean).join(" · ")],
                              ["Номинант", [form.nomLastName, form.nomFirstName, form.nomPatronymic].filter(Boolean).join(" ")],
                              ["Регион", form.nomRegion],
                              ["Организация", form.nomWorkplace],
                              ["Должность", form.nomPosition],
                              ["Фото", form.nomPhoto ? form.nomPhoto.name : ""],
                              ["Ссылки", form.links.filter(Boolean).length ? `${form.links.filter(Boolean).length} шт.` : ""],
                            ] as [string, string][])
                      ).map(([label, value]) => (
                        <div key={label} style={{ display: "flex", gap: 12, fontSize: 13, fontFamily: F }}>
                          <span style={{ color: "#6a6a72", minWidth: 130, flexShrink: 0 }}>{label}</span>
                          <span style={{ color: "#e8e8ec", wordBreak: "break-word" }}>{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {captchaEnabled && (
                    <div style={{ paddingBottom: 4 }}>
                      <SmartCaptcha onToken={setCaptchaToken} />
                    </div>
                  )}

                  {submitError && (
                    <p style={{ color: "#ff6b6b", fontSize: 14, fontFamily: F }}>
                      {submitError}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                    {backBtn(1)}
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        background: accent,
                        color: "white",
                        fontSize: 15,
                        fontFamily: F,
                        fontWeight: 500,
                        padding: "14px 36px",
                        border: 0,
                        cursor: submitting ? "not-allowed" : "pointer",
                        borderRadius: 999,
                        opacity: submitting ? 0.4 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      {submitting ? "Отправляем…" : "Отправить заявку"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
