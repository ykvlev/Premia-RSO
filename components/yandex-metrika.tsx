"use client";

import { useEffect } from "react";

const YM_ID = process.env.NEXT_PUBLIC_YM_ID ?? "";

export function YandexMetrika() {
  useEffect(() => {
    if (!YM_ID || typeof window === "undefined") return;

    (function (w: Window, d: Document, o: string, c: string) {
      (w as any)[o] = (w as any)[o] || function () {
        ((w as any)[o].q = (w as any)[o].q || []).push(arguments);
      };
      const s = d.createElement("script");
      s.async = true;
      s.src = `https://mc.yandex.ru/metrika/tag.js`;
      const insertPoint = d.getElementsByTagName("script")[0];
      insertPoint?.parentNode?.insertBefore(s, insertPoint);
    })(window, document, "ym", "ymdata");

    // Init call
    (window as any).ym?.(Number(YM_ID), "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: false,
    });
  }, []);

  if (!YM_ID) return null;

  return (
    <noscript>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://mc.yandex.ru/watch/${YM_ID}`}
          style={{ position: "absolute", left: "-9999px" }}
          alt=""
        />
      </div>
    </noscript>
  );
}
