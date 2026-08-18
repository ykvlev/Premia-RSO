import { describe, it, expect } from "vitest";
import { isAllowedMime, uploadConfig } from "@/lib/upload-config";

describe("upload-config", () => {
  it("разрешает pdf / office / изображения", () => {
    for (const m of [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ]) {
      expect(isAllowedMime(m), m).toBe(true);
    }
  });

  it("блокирует исполняемые / svg / html / архивы", () => {
    for (const m of [
      "application/x-msdownload",
      "image/svg+xml",
      "text/html",
      "application/zip",
      "application/octet-stream",
      "",
    ]) {
      expect(isAllowedMime(m), m).toBe(false);
    }
  });

  it("лимит файла — 10 МБ", () => {
    expect(uploadConfig.maxFileSizeBytes).toBe(10 * 1024 * 1024);
  });
});
