"use client";

import { motion } from "motion/react";
import { LoginForm } from "@/components/login-form";

const F = "var(--font-onest), sans-serif";

/** Отдельная страница входа для участников — «wow»-версия. */
export function ParticipantLogin() {
  return (
    <main
      style={{
        flex: 1,
        minHeight: "100vh",
        background: "#08080a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* пульсирующее синее свечение */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0.5, scale: 0.9 }}
        animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "-20%",
          left: "20%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(8,4,255,0.28) 0%, rgba(8,4,255,0) 62%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "stretch",
        }}
      >
        {/* ── ЛЕВО: бренд + приз ── */}
        <section
          style={{
            flex: "1 1 460px",
            minWidth: 320,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px clamp(24px, 5vw, 72px)",
            position: "relative",
          }}
        >
          <a
            href="/"
            style={{
              position: "absolute",
              top: 32,
              left: "clamp(24px, 5vw, 72px)",
              color: "#6a6a72",
              fontSize: 13,
              fontFamily: F,
              textDecoration: "none",
            }}
          >
            ← На сайт
          </a>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo/logo-white.svg"
              alt="Российские студенческие отряды"
              style={{ height: 56, width: "auto", marginBottom: 30 }}
            />
            <p
              style={{
                color: "#8a88ff",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1.6px",
                marginBottom: 14,
              }}
            >
              Национальная премия «Труд крут»
            </p>
            <h1
              style={{
                color: "#f2f0ec",
                fontSize: "clamp(34px, 5vw, 54px)",
                fontFamily: F,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                margin: "0 0 18px",
              }}
            >
              Личный кабинет
              <br />
              участника
            </h1>
            <p
              style={{
                color: "#9a9aa4",
                fontSize: 16,
                fontFamily: F,
                lineHeight: 1.6,
                maxWidth: 400,
                margin: 0,
              }}
            >
              Все твои заявки, их статусы и{" "}решения жюри —
              в{" "}одном месте. Ты вкладываешься — страна замечает.
            </p>
          </motion.div>

          {/* парящий приз */}
          <motion.img
            /* eslint-disable-next-line @next/next/no-img-element */
            src="/brand/photos/prize-2026.png"
            alt=""
            aria-hidden
            initial={{ opacity: 0, y: 30, rotate: -4 }}
            animate={{ opacity: 1, y: [0, -16, 0], rotate: -4 }}
            transition={{
              opacity: { duration: 1, delay: 0.3 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
            }}
            style={{
              width: "min(360px, 60%)",
              height: "auto",
              marginTop: 40,
              filter:
                "drop-shadow(0 40px 80px rgba(0,0,0,0.7)) drop-shadow(0 0 60px rgba(8,4,255,0.25))",
            }}
          />
        </section>

        {/* ── ПРАВО: форма ── */}
        <section
          style={{
            flex: "0 1 500px",
            minWidth: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px clamp(24px, 5vw, 56px)",
            background: "linear-gradient(180deg, rgba(18,18,22,0) 0%, rgba(18,18,22,0.5) 100%)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "100%",
              maxWidth: 400,
              background: "#121216",
              border: "1px solid #2a2a32",
              borderRadius: 20,
              padding: "32px 30px",
              boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
            }}
          >
            <h2
              style={{
                color: "#f2f0ec",
                fontSize: 26,
                fontFamily: F,
                fontWeight: 800,
                margin: "0 0 6px",
              }}
            >
              С возвращением!
            </h2>
            <p
              style={{
                color: "#9a9aa4",
                fontSize: 14,
                fontFamily: F,
                lineHeight: 1.5,
                margin: "0 0 24px",
              }}
            >
              Войди, чтобы следить за своими заявками.
            </p>

            <LoginForm />

            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid #2a2a32",
              }}
            >
              <p style={{ color: "#9a9aa4", fontSize: 13, fontFamily: F, margin: "0 0 12px" }}>
                Впервые здесь? Личный кабинет создаётся автоматически после первой
                заявки — данные для входа придут на почту.
              </p>
              <a
                href="/apply"
                style={{
                  display: "inline-block",
                  color: "#8a88ff",
                  fontSize: 14,
                  fontFamily: F,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Подать заявку →
              </a>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
