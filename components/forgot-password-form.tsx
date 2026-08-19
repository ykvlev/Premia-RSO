"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { sendResetCode, resetPassword } from "@/app/forgot-password/actions";

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

type Step = "email" | "code" | "newPassword" | "done";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await sendResetCode(email);
    if (!res.ok) {
      setError(res.error || "Ошибка");
      setPending(false);
      return;
    }

    setStep("code");
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

    // Передаём код на следующий шаг — проверим при сбросе
    setStep("newPassword");
    setPending(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      setPending(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      setPending(false);
      return;
    }

    const res = await resetPassword(email, code, newPassword);
    if (!res.ok) {
      setError(res.error || "Ошибка");
      setPending(false);
      return;
    }

    setStep("done");
    setPending(false);

    // Автоматический вход после смены пароля
    const loginRes = await signIn("credentials", {
      redirect: false,
      email,
      password: newPassword,
    });

    if (loginRes && !loginRes.error) {
      router.push("/cabinet");
      router.refresh();
    } else {
      router.push("/login");
    }
  }

  async function handleResend() {
    setPending(true);
    setError(null);
    const res = await sendResetCode(email);
    if (!res.ok) {
      setError(res.error || "Ошибка");
    } else {
      alert("Новый код отправлен на " + email);
    }
    setPending(false);
  }

  if (step === "done") {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(47,191,107,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 28,
          }}
        >
          ✓
        </div>
        <p style={{ color: "#f2f0ec", fontSize: 16, fontFamily: F, fontWeight: 600, marginBottom: 8 }}>
          Пароль обновлён
        </p>
        <p style={{ color: "#9a9aa4", fontSize: 14, fontFamily: F }}>
          Переход в личный кабинет…
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={
        step === "email"
          ? handleSendCode
          : step === "code"
            ? handleVerifyCode
            : handleReset
      }
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      {step === "email" && (
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
      )}

      {step === "code" && (
        <>
          <p style={{ color: "#c8c8d0", fontSize: 14, fontFamily: F, lineHeight: 1.5, marginBottom: 4 }}>
            Код отправлен на <b style={{ color: "#f2f0ec" }}>{email}</b>
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

      {step === "newPassword" && (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>Новый пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          : step === "email"
            ? "Отправить код →"
            : step === "code"
              ? "Подтвердить код →"
              : "Сменить пароль →"}
      </button>
    </form>
  );
}
