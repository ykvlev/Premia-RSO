import { describe, it, expect, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("разрешает до лимита, затем блокирует", () => {
    const key = "t:allow";
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000)).toBe(true);
    expect(rateLimit(key, 3, 1000)).toBe(false);
    expect(rateLimit(key, 3, 1000)).toBe(false);
  });

  it("считает ключи независимо", () => {
    expect(rateLimit("t:a", 1, 1000)).toBe(true);
    expect(rateLimit("t:a", 1, 1000)).toBe(false);
    expect(rateLimit("t:b", 1, 1000)).toBe(true);
  });

  it("сбрасывает счётчик после окна", () => {
    vi.useFakeTimers();
    try {
      const key = "t:win";
      expect(rateLimit(key, 1, 1000)).toBe(true);
      expect(rateLimit(key, 1, 1000)).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(rateLimit(key, 1, 1000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
