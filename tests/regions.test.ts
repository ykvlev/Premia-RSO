import { describe, it, expect } from "vitest";
import { REGIONS } from "../lib/regions";

describe("REGIONS list", () => {
  it("has a substantial region list (60+)", () => {
    expect(REGIONS.length).toBeGreaterThanOrEqual(60);
  });

  it("includes Moscow", () => {
    expect(REGIONS).toContain("Москва");
  });

  it("includes Saint Petersburg", () => {
    expect(REGIONS).toContain("Санкт-Петербург");
  });

  it("has no duplicate entries", () => {
    const unique = new Set(REGIONS);
    expect(unique.size).toBe(REGIONS.length);
  });

  it("includes Другой регион as fallback", () => {
    expect(REGIONS).toContain("Другой регион");
  });
});
