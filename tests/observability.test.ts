import { describe, it, expect } from "vitest";
import {
  recordPerf,
  getPerfStats,
  recordRequest,
  getRequestStats,
  recordError,
  getRecentErrors,
  clearErrors,
} from "@/lib/observability";

describe("observability · perf", () => {
  it("считает сводку и перцентили по метке", () => {
    for (const ms of [10, 20, 30, 40, 100]) recordPerf("test.op", ms);
    const s = getPerfStats(60);
    expect(s.count).toBeGreaterThanOrEqual(5);
    expect(s.max).toBeGreaterThanOrEqual(100);
    const label = s.byLabel.find((l) => l.label === "test.op");
    expect(label).toBeTruthy();
    expect(label!.count).toBeGreaterThanOrEqual(5);
  });
});

describe("observability · requests", () => {
  it("пишет запросы и считает топ-пути", () => {
    const at = Date.now();
    recordRequest({ method: "GET", path: "/uniq-x", at });
    recordRequest({ method: "GET", path: "/uniq-x", at });
    recordRequest({ method: "GET", path: "/uniq-y", at });
    const st = getRequestStats(15);
    const x = st.topPaths.find((p) => p.path === "/uniq-x");
    expect(x).toBeTruthy();
    expect(x!.count).toBeGreaterThanOrEqual(2);
  });
});

describe("observability · errors", () => {
  it("пишет и очищает буфер", () => {
    recordError(new Error("boom-test"), "unit");
    expect(getRecentErrors(20).some((e) => e.message === "boom-test")).toBe(true);
    const cleared = clearErrors();
    expect(cleared).toBeGreaterThanOrEqual(1);
    expect(getRecentErrors(20).length).toBe(0);
  });
});
