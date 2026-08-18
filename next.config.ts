import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// SmartCaptcha (Yandex) — источники скрипта/фрейма/соединений капчи.
// ВАЖНО: виджет грузится с smartcaptcha.cloud.yandex.ru (см. components/apply/smart-captcha.tsx).
const CAPTCHA = "https://smartcaptcha.cloud.yandex.ru";

/**
 * Content-Security-Policy. Осознанные послабления:
 *  - style-src 'unsafe-inline' — в проекте много инлайновых style={{}} + стили Next.
 *  - script-src 'unsafe-inline' — Next инжектит инлайновые скрипты гидрации/стриминга
 *    (без nonce-инфраструктуры это необходимо).
 *  - 'unsafe-eval' — только в dev (HMR Turbopack); в проде НЕ добавляется.
 */
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `img-src 'self' data: blob: ${CAPTCHA}`,
  `font-src 'self' data:`,
  `style-src 'self' 'unsafe-inline' ${CAPTCHA}`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${CAPTCHA}`,
  `connect-src 'self' ${CAPTCHA}`,
  `frame-src 'self' ${CAPTCHA}`,
  `worker-src 'self' blob:`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
