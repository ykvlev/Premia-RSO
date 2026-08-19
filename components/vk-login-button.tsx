"use client";

import { useRef, useEffect } from "react";

const F = "var(--font-onest), sans-serif";

/**
 * VK ID OneTap кнопка.
 * Загружает VKIDSDK, рендерит виджет, при успехе отправляет code на /api/auth/vk/exchange.
 */
export function VkLoginButton({ onError }: { onError?: (msg: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    // Загружаем VK ID SDK
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@vkid/sdk@3.0.0/dist-sdk/umd/index.js";
    script.async = true;
    script.onload = () => initVkid();
    script.onerror = () => onError?.("Не удалось загрузить VK SDK");
    document.head.appendChild(script);

    function initVkid() {
      // @ts-expect-error VKIDSDK global
      const VKID = window.VKIDSDK;
      if (!VKID) {
        onError?.("VK SDK не загружен");
        return;
      }

      const appId = process.env.NEXT_PUBLIC_VK_ID_APP_ID;
      const redirectUrl = process.env.NEXT_PUBLIC_VK_REDIRECT_URL;

      if (!appId || !redirectUrl) {
        onError?.("VK OAuth не настроен");
        return;
      }

      VKID.Config.init({
        app: Number(appId),
        redirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: "",
      });

      const oneTap = new VKID.OneTap();

      if (!containerRef.current) return;

      oneTap
        .render({
          container: containerRef.current,
          scheme: "dark",
          showAlternativeLogin: true,
          skin: "secondary",
        })
        .on(VKID.WidgetEvents.ERROR, (err: unknown) => {
          console.error("[VK]", err);
          onError?.("Ошибка VK виджета");
        })
        .on(
          VKID.OneTapInternalEvents.LOGIN_SUCCESS,
          async (payload: { code: string; device_id: string }) => {
            try {
              const res = await fetch("/api/auth/vk/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  code: payload.code,
                  deviceId: payload.device_id,
                }),
              });

              const data = await res.json();

              if (data.ok) {
                window.location.href = data.redirect || "/cabinet";
              } else {
                onError?.(data.error || "Ошибка входа через VK");
              }
            } catch (err) {
              console.error("[VK exchange]", err);
              onError?.("Ошибка сервера при входе через VK");
            }
          },
        );
    }

    return () => {
      // Cleanup scripts on unmount
    };
  }, [onError]);

  return <div ref={containerRef} style={{ minHeight: 48 }} />;
}
