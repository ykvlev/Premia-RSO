import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Сгенерённый Figma Make код (SVG-компоненты паттерна/лого) — не линтуем.
    "components/landing/imports/**",
    // Сгенерённый Prisma-клиент.
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
