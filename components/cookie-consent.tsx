"use client";

import { useState, useEffect } from "react";

/**
 * Баннер согласия на cookie. Аналитические cookie (Яндекс.Метрика) грузятся
 * ТОЛЬКО после согласия. Выбор хранится в localStorage.
 */

const YM_ID = 111012999;
const KEY = "cookie-consent-v1";
const F = "var(--font-onest), sans-serif";

type Consent = { necessary: true; analytics: boolean; functional: boolean };

declare global {
  interface Window {
    _ymLoaded?: boolean;
    ym?: (...args: unknown[]) => void;
  }
}

function loadMetrika() {
  if (typeof window === "undefined" || window._ymLoaded) return;
  window._ymLoaded = true;

  const w = window as unknown as {
    ym: { (...a: unknown[]): void; a?: unknown[]; l?: number };
  };
  w.ym =
    w.ym ||
    function (...args: unknown[]) {
      (w.ym.a = w.ym.a || []).push(args);
    };
  w.ym.l = Date.now();

  const src = `https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`;
  if (![...document.scripts].some((s) => s.src === src)) {
    const k = document.createElement("script");
    k.async = true;
    k.src = src;
    document.head.appendChild(k);
  }

  w.ym(YM_ID, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (!saved) {
      setShow(true);
      return;
    }
    try {
      const c = JSON.parse(saved) as Consent;
      if (c.analytics) loadMetrika();
    } catch {
      setShow(true);
    }
  }, []);

  function save(c: Consent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {
      /* ignore */
    }
    setShow(false);
    if (c.analytics) loadMetrika();
  }

  if (!show) return null;

  const btnBase: React.CSSProperties = {
    fontFamily: F,
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 999,
    padding: "11px 20px",
    cursor: "pointer",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9995,
        display: "flex",
        justifyContent: "center",
        padding: 16,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 560,
          background: "#121216",
          border: "1px solid #2a2a32",
          borderRadius: 18,
          padding: "22px 22px 20px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Логотип РСО */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo/logo-white.svg"
          alt="Российские студенческие отряды"
          style={{ height: 34, width: "auto", display: "block", marginBottom: 14 }}
        />

        <p
          style={{
            color: "#c8c8d0",
            fontSize: 14,
            fontFamily: F,
            lineHeight: 1.55,
            margin: "0 0 16px",
          }}
        >
          Мы используем файлы cookie, чтобы сайт работал корректно и чтобы улучшать его.
          Необходимые cookie обеспечивают работу сайта, аналитические — помогают понять,
          как им пользуются. Подробнее — в{" "}
          <a
            href="/cookie"
            style={{ color: "#8a88ff", textDecoration: "underline" }}
          >
            Политике cookie
          </a>{" "}
          и{" "}
          <a
            href="/privacy"
            style={{ color: "#8a88ff", textDecoration: "underline" }}
          >
            Политике конфиденциальности
          </a>
          .
        </p>

        {settings && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 16,
              padding: "14px 16px",
              background: "#0f0f14",
              border: "1px solid #2a2a32",
              borderRadius: 12,
            }}
          >
            <Toggle label="Необходимые" hint="Нужны для работы сайта" checked disabled />
            <Toggle
              label="Аналитические"
              hint="Статистика посещений (Яндекс.Метрика)"
              checked={analytics}
              onChange={setAnalytics}
            />
            <Toggle
              label="Функциональные"
              hint="Запоминание настроек"
              checked={functional}
              onChange={setFunctional}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            style={{ ...btnBase, background: "#0804ff", color: "#fff" }}
            onClick={() => save({ necessary: true, analytics: true, functional: true })}
          >
            Принять все
          </button>
          {settings ? (
            <button
              style={{ ...btnBase, background: "transparent", borderColor: "#2a2a32", color: "#f2f0ec" }}
              onClick={() => save({ necessary: true, analytics, functional })}
            >
              Сохранить выбор
            </button>
          ) : (
            <button
              style={{ ...btnBase, background: "transparent", borderColor: "#2a2a32", color: "#f2f0ec" }}
              onClick={() =>
                save({ necessary: true, analytics: false, functional: false })
              }
            >
              Только необходимые
            </button>
          )}
          <button
            style={{ ...btnBase, background: "transparent", color: "#9a9aa4", border: "none" }}
            onClick={() => setSettings((s) => !s)}
          >
            {settings ? "Скрыть" : "Настроить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span>
        <span
          style={{ color: "#f2f0ec", fontSize: 13, fontFamily: F, fontWeight: 600, display: "block" }}
        >
          {label}
        </span>
        <span style={{ color: "#6a6a72", fontSize: 12, fontFamily: F }}>{hint}</span>
      </span>
      <span
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          flexShrink: 0,
          width: 40,
          height: 22,
          borderRadius: 999,
          background: checked ? "#0804ff" : "#2a2a32",
          position: "relative",
          transition: "background 0.15s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </span>
    </label>
  );
}
