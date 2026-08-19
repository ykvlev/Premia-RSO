"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  sendVerificationCode,
  verifyCode,
  registerUser,
} from "@/app/register/actions";

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

type Step = "credentials" | "code" | "profile";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");

  // Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Code
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");

  // Profile
  const [fio, setFio] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // ── Step 1: Email + password → send code ───────────────────────────────
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

    setStep("code");
    setPending(false);
  }

  // ── Step 2: Verify code → get token ───────────────────────────────────
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
    setStep("profile");
    setPending(false);
  }

  // ── Step 3: FIO → register → auto-login ───────────────────────────────
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
    });

    if (!res.ok) {
      setError(res.error || "Ошибка регистрации");
      setPending(false);
      return;
    }

    // Автоматический вход после регистрации
    const loginRes = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (!loginRes || loginRes.error) {
      // Регистрация прошла, но вход не удался — отправляем на логин
      router.push("/login");
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  // ── Resend code ───────────────────────────────────────────────────────
  async function handleResend() {
    setPending(true);
    setError(null);
    const res = await sendVerificationCode(email);
    if (!res.ok) {
      setError(res.error || "Ошибка");
    } else {
      setError(null);
      alert("Новый код отправлен на " + email);
    }
    setPending(false);
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={
        step === "credentials"
          ? handleSendCode
          : step === "code"
            ? handleVerifyCode
            : handleRegister
      }
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      {/* ── Step 1: Email + password ── */}
      {step === "credentials" && (
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

      {/* ── Step 2: Verification code ── */}
      {step === "code" && (
        <>
          <p
            style={{
              color: "#c8c8d0",
              fontSize: 14,
              fontFamily: F,
              lineHeight: 1.5,
              marginBottom: 4,
            }}
          >
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
              style={{
                ...inputStyle,
                fontSize: 24,
                letterSpacing: 8,
                textAlign: "center",
                fontFamily: "'Courier New', monospace",
              }}
              placeholder="000000"
            />
          </label>

          <button
            type="button"
            onClick={handleResend}
            disabled={pending}
            style={{
              background: "none",
              border: "none",
              color: "#0804ff",
              fontSize: 13,
              fontFamily: F,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
              alignSelf: "flex-start",
            }}
          >
            Отправить код повторно
          </button>
        </>
      )}

      {/* ── Step 3: FIO ── */}
      {step === "profile" && (
        <>
          <p
            style={{
              color: "#c8c8d0",
              fontSize: 14,
              fontFamily: F,
              lineHeight: 1.5,
              marginBottom: 4,
            }}
          >
            Почта подтверждена. Осталось ввести ФИО.
          </p>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>ФИО</span>
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
        </>
      )}

      {error && <div style={errorBox}>{error}</div>}

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
        {pending
          ? "Обработка…"
          : step === "credentials"
            ? "Получить код →"
            : step === "code"
              ? "Подтвердить код →"
              : "Зарегистрироваться →"}
      </button>
    </form>
  );
}
