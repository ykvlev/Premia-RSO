"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/profile/actions";
import { REGIONS } from "@/lib/regions";

const F = "var(--font-onest), sans-serif";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f0f14",
  border: "1px solid #2a2a32",
  borderRadius: 10,
  padding: "13px 15px",
  fontSize: 15,
  fontFamily: F,
  color: "#f2f0ec",
  outline: "none",
  transition: "border-color 0.15s",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236a6a72' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 15px center",
  paddingRight: 38,
};

const labelStyle: React.CSSProperties = {
  color: "#9a9aa4",
  fontSize: 11,
  fontFamily: F,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.7px",
};

const errorBox: React.CSSProperties = {
  background: "rgba(8,4,255,0.1)",
  borderLeft: "2px solid #0804ff",
  color: "#f2f0ec",
  fontFamily: F,
  fontSize: 14,
  padding: "10px 14px",
  borderRadius: 6,
};

const successBox: React.CSSProperties = {
  background: "rgba(47,191,107,0.1)",
  borderLeft: "2px solid #2fbf6b",
  color: "#f2f0ec",
  fontFamily: F,
  fontSize: 14,
  padding: "10px 14px",
  borderRadius: 6,
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  marginTop: 4,
  background: "#0804ff",
  color: "#ffffff",
  border: "none",
  borderRadius: 999,
  padding: "14px 20px",
  fontSize: 15,
  fontFamily: F,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.15s",
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: "#1a1a55",
  cursor: "default",
};

type User = {
  id: string;
  fio: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthDate: Date | null;
  city: string | null;
  region: string | null;
  telegram: string | null;
  vkUrl: string | null;
  avatarUrl: string | null;
  emailVerified: Date | null;
};

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [fio, setFio] = useState(user.fio || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [gender, setGender] = useState(user.gender || "");
  const [birthDate, setBirthDate] = useState(
    user.birthDate
      ? new Date(user.birthDate).toISOString().split("T")[0]
      : "",
  );
  const [city, setCity] = useState(user.city || "");
  const [region, setRegion] = useState(user.region || "");
  const [telegram, setTelegram] = useState(user.telegram || "");
  const [vkUrl, setVkUrl] = useState(user.vkUrl || "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const isComplete = Boolean(
    fio && phone && gender && birthDate && city && region,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);

    const res = await updateProfile({
      fio,
      phone,
      gender,
      birthDate,
      city,
      region,
      telegram,
      vkUrl,
    });

    if (!res.ok) {
      setError(res.error || "Ошибка сохранения");
      setPending(false);
      return;
    }

    setSuccess(true);
    setPending(false);
    setTimeout(() => router.push("/cabinet"), 1500);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* ── ФИО ── */}
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>ФИО *</span>
        <input
          type="text"
          required
          autoComplete="name"
          value={fio}
          onChange={(e) => setFio(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          style={inputStyle}
          placeholder="Фамилия Имя Отчество"
        />
      </label>

      {/* ── Телефон ── */}
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>Телефон *</span>
        <input
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          style={inputStyle}
          placeholder="+7 (999) 123-45-67"
        />
      </label>

      {/* ── Пол + Дата рождения (рядом) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={labelStyle}>Пол *</span>
          <select
            required
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
            style={{
              ...selectStyle,
              color: gender ? "#f2f0ec" : "#6a6a72",
            }}
          >
            <option value="" disabled>
              Выберите
            </option>
            <option value="Мужской">Мужской</option>
            <option value="Женский">Женский</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={labelStyle}>Дата рождения *</span>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
            style={{
              ...inputStyle,
              colorScheme: "dark",
            }}
          />
        </label>
      </div>

      {/* ── Регион ── */}
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>Регион *</span>
        <select
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          style={{
            ...selectStyle,
            color: region ? "#f2f0ec" : "#6a6a72",
          }}
        >
          <option value="" disabled>
            Выберите регион
          </option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      {/* ── Город ── */}
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>Город *</span>
        <input
          type="text"
          required
          autoComplete="address-level2"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          style={inputStyle}
          placeholder="Москва"
        />
      </label>

      {/* ── Telegram (необязательно) ── */}
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>Telegram</span>
        <input
          type="text"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          style={inputStyle}
          placeholder="@username"
        />
      </label>

      {/* ── VK (необязательно) ── */}
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>ВКонтакте</span>
        <input
          type="url"
          value={vkUrl}
          onChange={(e) => setVkUrl(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          style={inputStyle}
          placeholder="https://vk.com/username"
        />
      </label>

      {/* ── Статус заполненности ── */}
      {!isComplete && (
        <p
          style={{
            color: "#9a9aa4",
            fontSize: 13,
            fontFamily: F,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          * — обязательные поля. Заполните все обязательные поля, чтобы
          подавать заявки на премию.
        </p>
      )}

      {error && <div style={errorBox}>{error}</div>}
      {success && (
        <div style={successBox}>Профиль сохранён</div>
      )}

      <button
        type="submit"
        disabled={pending}
        style={pending ? btnDisabled : btnPrimary}
        onMouseEnter={(e) => {
          if (!pending) e.currentTarget.style.background = "#0602cc";
        }}
        onMouseLeave={(e) => {
          if (!pending) e.currentTarget.style.background = "#0804ff";
        }}
      >
        {pending ? "Сохранение…" : "Сохранить профиль"}
      </button>
    </form>
  );
}
