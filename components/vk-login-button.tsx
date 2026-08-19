"use client";

import { useState } from "react";

const F = "var(--font-onest), sans-serif";

/**
 * VK ID OAuth кнопка — redirect на id.vk.com/auth.
 * Генерирует state для CSRF, сохраняет в sessionStorage.
 */
export function VkLoginButton() {
  const [loading, setLoading] = useState(false);

  const appId = process.env.NEXT_PUBLIC_VK_ID_APP_ID;
  const redirectUrl = process.env.NEXT_PUBLIC_VK_REDIRECT_URL;

  if (!appId || !redirectUrl) return null;

  function handleClick() {
    setLoading(true);
    const state = crypto.randomUUID();
    sessionStorage.setItem("vk_oauth_state", state);
    window.location.href =
      `https://id.vk.com/auth` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
      `&response_type=code` +
      `&display=page` +
      `&state=${state}`;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        padding: "13px 20px",
        background: loading ? "#3A5DB8" : "#4680FF",
        color: "#fff",
        borderRadius: 12,
        fontSize: 15,
        fontFamily: F,
        fontWeight: 600,
        border: "none",
        cursor: loading ? "default" : "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#3A6DE0"; }}
      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#4680FF"; }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2Zm3.09 14.29h-1.77c-.67 0-.88-.54-2.1-1.77-1.1-1.05-1.58-1.19-1.85-1.19-.37 0-.48.11-.48.64v1.62c0 .45-.14.73-1.32.73-1.94 0-4.09-1.18-5.61-3.39C3.37 9.88 2.92 7.5 2.92 7.04c0-.26.11-.5.64-.5h1.77c.45 0 .62.2.79.68.86 2.53 2.3 4.73 2.89 4.73.22 0 .33-.11.33-.64V8.34c-.07-1.17-.69-1.27-.69-1.69 0-.22.18-.43.48-.43h2.77c.4 0 .55.2.55.64v3.47c0 .4.18.55.29.55.22 0 .41-.14.82-.56 1.26-1.46 2.16-3.71 2.16-3.71.12-.26.32-.49.76-.49h1.77c.53 0 .65.26.53.64-.22 1.02-2.37 4.06-2.37 4.06-.19.32-.26.46 0 .81.19.26.81.79 1.22 1.27.76.87 1.34 1.61 1.5 2.11.16.49-.08.75-.57.75Z"
          fill="white"
        />
      </svg>
      {loading ? "Перенаправление…" : "Войти через VK"}
    </button>
  );
}
