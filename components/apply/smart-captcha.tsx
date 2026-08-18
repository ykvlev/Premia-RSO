"use client";

import { useEffect, useRef } from "react";

/** Публичный sitekey (ysc1_…). Пусто → капча не настроена, виджет не рисуем. */
const SITEKEY = process.env.NEXT_PUBLIC_SMARTCAPTCHA_CLIENT_KEY;
const SRC = "https://smartcaptcha.cloud.yandex.ru/captcha.js";

type SmartCaptchaApi = {
  render: (
    el: HTMLElement,
    params: {
      sitekey: string;
      hl?: string;
      callback?: (token: string) => void;
    },
  ) => number;
  subscribe: (id: number, event: string, cb: (arg?: unknown) => void) => void;
  destroy: (id: number) => void;
};

declare global {
  interface Window {
    smartCaptcha?: SmartCaptchaApi;
  }
}

export const captchaEnabled = Boolean(SITEKEY);

/** Виджет Yandex SmartCaptcha. Токен отдаёт через onToken (пусто = сброшен). */
export function SmartCaptcha({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);

  useEffect(() => {
    if (!SITEKEY) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.smartCaptcha) return;
      if (widgetId.current !== null) return;
      widgetId.current = window.smartCaptcha.render(containerRef.current, {
        sitekey: SITEKEY,
        hl: "ru",
        callback: (token: string) => onToken(token),
      });
      window.smartCaptcha.subscribe(widgetId.current, "token-expired", () =>
        onToken(""),
      );
      window.smartCaptcha.subscribe(widgetId.current, "network-error", () =>
        onToken(""),
      );
    };

    if (window.smartCaptcha) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${SRC}"]`,
    );
    if (!script) {
      script = document.createElement("script");
      script.src = SRC;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    // подстраховка: скрипт мог уже загрузиться, но объект появиться чуть позже
    const poll = setInterval(() => {
      if (window.smartCaptcha) {
        clearInterval(poll);
        renderWidget();
      }
    }, 200);
    const stop = setTimeout(() => clearInterval(poll), 10000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(stop);
      script?.removeEventListener("load", renderWidget);
      if (widgetId.current !== null && window.smartCaptcha) {
        try {
          window.smartCaptcha.destroy(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
  }, [onToken]);

  if (!SITEKEY) return null;
  return <div ref={containerRef} style={{ minHeight: 100 }} />;
}
