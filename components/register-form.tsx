"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  sendVerificationCode,
  verifyCode,
  registerUser,
} from "@/app/register/actions";

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

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1, label: "Email" },
  { num: 2, label: "Код" },
  { num: 3, label: "Данные" },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24, position: "relative" }}>
      {STEPS.map((s, i) => {
        const isActive = s.num === current;
        const isDone = s.num < current;
        return (
          <div key={s.num} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 600,
                transition: "all 0.2s",
                background: isDone ? "#2fbf6b" : isActive ? "#0804ff" : "#1a1a24",
                color: isDone || isActive ? "#fff" : "#6a6a72",
                border: isActive ? "2px solid #0804ff" : isDone ? "2px solid #2fbf6b" : "2px solid #2a2a32",
                position: "relative",
                zIndex: 1,
              }}
            >
              {isDone ? "✓" : s.num}
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: F,
                fontWeight: 500,
                color: isActive ? "#f2f0ec" : "#6a6a72",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {s.label}
            </span>
          </div>
        );
      })}
      {/* Connector lines */}
      <div
        style={{
          position: "absolute",
          top: 15,
          left: "calc(50% / 3 + 16px)",
          right: "calc(50% / 3 + 16px)",
          height: 2,
          background: current > 1 ? "#2fbf6b" : "#2a2a32",
          zIndex: 0,
        }}
      />
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");

  // Step 3 — profile
  const [fio, setFio] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      setPending(false);
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      setPending(false);
      return;
    }

    const res = await sendVerificationCode(email);
    if (!res.ok) {
      setError(res.error || "Ошибка");
      setPending(false);
      return;
    }

    setStep(2);
    setPending(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (code.length !== 6) {
      setError("Код должен содержать 6 цифр");
      setPending(false);
      return;
    }

    const res = await verifyCode(email, code);
    if (!res.ok || !res.token) {
      setError(res.error || "Неверный код");
      setPending(false);
      return;
    }

    setVerificationToken(res.token);
    setStep(3);
    setPending(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!fio.trim() || fio.trim().length < 2) {
      setError("Введите ФИО");
      setPending(false);
      return;
    }

    const res = await registerUser({
      token: verificationToken,
      email,
      password,
      fio: fio.trim(),
      phone: phone || undefined,
      gender: gender || undefined,
      birthDate: birthDate || undefined,
      city: city || undefined,
      region: region || undefined,
    });

    if (!res.ok) {
      setError(res.error || "Ошибка регистрации");
      setPending(false);
      return;
    }

    const loginRes = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (!loginRes || loginRes.error) {
      router.push("/login");
      return;
    }

    router.push("/cabinet");
    router.refresh();
  }

  async function handleResend() {
    setPending(true);
    setError(null);
    const res = await sendVerificationCode(email);
    if (!res.ok) {
      setError(res.error || "Ошибка");
    }
    setPending(false);
  }

  return (
    <form
      onSubmit={step === 1 ? handleSendCode : step === 2 ? handleVerifyCode : handleRegister}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <StepIndicator current={step} />

      {/* ── Step 1: Email + password ── */}
      {step === 1 && (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
              style={inputStyle}
              placeholder="you@example.com"
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>Пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
              style={inputStyle}
              placeholder="Минимум 8 символов"
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>Повторите пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
              style={inputStyle}
            />
          </label>
        </>
      )}

      {/* ── Step 2: Code ── */}
      {step === 2 && (
        <>
          <p style={{ color: "#c8c8d0", fontSize: 14, fontFamily: F, lineHeight: 1.5, marginBottom: 4 }}>
            Код подтверждения отправлен на{" "}
            <b style={{ color: "#f2f0ec" }}>{email}</b>
          </p>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>Код из письма</span>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
              style={{ ...inputStyle, fontSize: 24, letterSpacing: 8, textAlign: "center", fontFamily: "'Courier New', monospace" }}
              placeholder="000000"
            />
          </label>

          <button
            type="button"
            onClick={handleResend}
            disabled={pending}
            style={{ background: "none", border: "none", color: "#0804ff", fontSize: 13, fontFamily: F, cursor: "pointer", textDecoration: "underline", padding: 0, alignSelf: "flex-start" }}
          >
            Отправить код повторно
          </button>
        </>
      )}

      {/* ── Step 3: Profile ── */}
      {step === 3 && (
        <>
          <p style={{ color: "#c8c8d0", fontSize: 14, fontFamily: F, lineHeight: 1.5, marginBottom: 4 }}>
            Почта подтверждена. Заполните данные для участия.
          </p>

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

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>Телефон</span>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
              style={inputStyle}
              placeholder="+7 (999) 123-45-67"
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelStyle}>Пол</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
                style={{ ...inputStyle, cursor: "pointer", color: gender ? "#f2f0ec" : "#6a6a72" }}
              >
                <option value="">Не указан</option>
                <option value="Мужской">Мужской</option>
                <option value="Женский">Женский</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelStyle}>Дата рождения</span>
              <input
                type="date"
                autoComplete="bday"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
                style={{ ...inputStyle, colorScheme: "dark" }}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelStyle}>Город</span>
              <input
                type="text"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
                style={inputStyle}
                placeholder="Москва"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelStyle}>Регион</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
                style={{ ...inputStyle, cursor: "pointer", color: region ? "#f2f0ec" : "#6a6a72" }}
              >
                <option value="">Выберите регион</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}

      {error && <div style={errorBox}>{error}</div>}

      <button
        type="submit"
        disabled={pending}
        style={pending ? btnDisabled : btnPrimary}
        onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = "#0602cc"; }}
        onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = "#0804ff"; }}
      >
        {pending
          ? "Обработка…"
          : step === 1
            ? "Получить код →"
            : step === 2
              ? "Подтвердить код →"
              : "Зарегистрироваться →"}
      </button>
    </form>
  );
}
