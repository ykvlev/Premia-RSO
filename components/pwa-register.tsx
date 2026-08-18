"use client";

import { useEffect } from "react";

/** Регистрация service worker (PWA). Молча игнорирует ошибки/неподдержку. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore */
      });
    }
  }, []);
  return null;
}
