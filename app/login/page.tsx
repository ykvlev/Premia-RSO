import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Вход" };

const F = "var(--font-onest), sans-serif";

/** Вход для жюри и организаторов. Уже вошёл — уводим по роли. */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    const target =
      session.user.role === "jury"
        ? "/jury"
        : session.user.role === "admin" || session.user.role === "superadmin"
          ? "/admin"
          : "/cabinet";
    redirect(target);
  }

  return (
    <main
      style={{
        flex: 1,
        minHeight: "100vh",
        background: "#08080a",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      {/* мягкое синее свечение сверху */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(680px circle at 50% -10%, rgba(8,4,255,0.1), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", width: "100%", maxWidth: 400 }} className="fade-up">
        {/* назад на сайт */}
        <a
          href="/"
          style={{
            display: "inline-block",
            color: "#6a6a72",
            fontSize: 13,
            fontFamily: F,
            textDecoration: "none",
            marginBottom: 36,
          }}
        >
          ← На сайт
        </a>

        {/* логотип */}
        <div style={{ marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero-wordmark.svg"
            alt="Труд Крут"
            style={{ display: "block", width: 168, height: "auto" }}
          />
          <p
            style={{
              color: "#6a6a72",
              fontSize: 11,
              fontFamily: F,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "1.4px",
              marginTop: 14,
            }}
          >
            Российские студенческие отряды
          </p>
        </div>

        {/* заголовок */}
        <h1
          style={{
            color: "#f2f0ec",
            fontSize: 30,
            fontFamily: F,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "0.5px",
            marginBottom: 10,
          }}
        >
          Вход / Регистрация
        </h1>
        <p
          style={{
            color: "#9a9aa4",
            fontSize: 14,
            fontFamily: F,
            lineHeight: 1.5,
            marginBottom: 28,
          }}
        >
          Войдите или создайте аккаунт для подачи заявок на премию «Труд крут».
        </p>

        {/* Табы Вход / Регистрация */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#121216",
            border: "1px solid #2a2a32",
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
          }}
        >
          <a
            href="/login"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              borderRadius: 8,
              background: "#0804ff",
              color: "#fff",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Вход
          </a>
          <a
            href="/register"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 0",
              borderRadius: 8,
              background: "transparent",
              color: "#9a9aa4",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Регистрация
          </a>
        </div>

        {/* карточка с формой */}
        <div
          style={{
            background: "#121216",
            border: "1px solid #2a2a32",
            borderRadius: 16,
            padding: "28px 26px",
          }}
        >
          <LoginForm />
        </div>

        <p
          style={{
            color: "#6a6a72",
            fontSize: 13,
            fontFamily: F,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Нет аккаунта?{" "}
          <a href="/register" style={{ color: "#0804ff", textDecoration: "none" }}>
            Зарегистрироваться
          </a>
        </p>

        <p
          style={{
            color: "#4a4a56",
            fontSize: 12,
            fontFamily: F,
            textAlign: "center",
            marginTop: 24,
          }}
        >
          Национальная премия «Труд крут»
        </p>
      </div>
    </main>
  );
}
