"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";

/** Куда отправлять после входа — по роли из сессии. */
const roleHome: Record<string, string> = {
  jury: "/jury",
  admin: "/admin",
  superadmin: "/admin",
  participant: "/cabinet",
};

const F = "var(--font-onest), sans-serif";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await signIn("credentials", { redirect: false, email, password });

    if (!res || res.error) {
      setError("Неверный email или пароль");
      setPending(false);
      return;
    }

    const session = await getSession();
    const target = roleHome[session?.user?.role ?? "participant"] ?? "/";
    router.push(target);
    router.refresh();
  }

  const labelStyle: React.CSSProperties = {
    color: "#9a9aa4",
    fontSize: 11,
    fontFamily: F,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.7px",
  };

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

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
          placeholder="you@trudkrut.ru"
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>Пароль</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
          style={inputStyle}
        />
      </label>

      {error && (
        <div
          style={{
            background: "rgba(8,4,255,0.1)",
            borderLeft: "2px solid #0804ff",
            color: "#f2f0ec",
            fontFamily: F,
            fontSize: 14,
            padding: "10px 14px",
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: "100%",
          marginTop: 4,
          background: pending ? "#1a1a55" : "#0804ff",
          color: "#ffffff",
          border: "none",
          borderRadius: 999,
          padding: "14px 20px",
          fontSize: 15,
          fontFamily: F,
          fontWeight: 600,
          cursor: pending ? "default" : "pointer",
          transition: "background 0.15s, transform 0.1s",
        }}
        onMouseEnter={(e) => {
          if (!pending) e.currentTarget.style.background = "#0602cc";
        }}
        onMouseLeave={(e) => {
          if (!pending) e.currentTarget.style.background = "#0804ff";
        }}
      >
        {pending ? "Входим…" : "Войти →"}
      </button>
    </form>
  );
}
