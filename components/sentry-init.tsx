"use client";

import { useEffect } from "react";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export function SentryInit() {
  useEffect(() => {
    if (!SENTRY_DSN || typeof window === "undefined") return;

    const script = document.createElement("script");
    script.src = "https://browser.sentry-cdn.com/8.49.0/bundle.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Sentry = (window as any).Sentry;
        if (Sentry?.init) {
          Sentry.init({
            dsn: SENTRY_DSN,
            environment: process.env.NODE_ENV ?? "development",
            tracesSampleRate: 0.2,
            replaysSessionSampleRate: 0.05,
            replaysOnErrorSampleRate: 0.5,
          });
        }
      } catch {
        // silent
      }
    };
    document.head.appendChild(script);
  }, []);

  return null;
}
