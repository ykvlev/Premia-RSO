import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest — юнит-тесты чистой логики (валидация, безопасность, права).
 * `@/` резолвится в корень проекта, как в tsconfig paths.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
