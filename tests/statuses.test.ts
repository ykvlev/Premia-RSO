import { describe, it, expect } from "vitest";

const APP_STATUSES = [
  "new",
  "queued",
  "review",
  "revision",
  "scoring",
  "finalist",
  "winner",
  "rejected",
] as const;

const ROLES = ["user", "admin", "superadmin", "jury"] as const;

describe("Application statuses", () => {
  it("has 8 statuses", () => {
    expect(APP_STATUSES.length).toBe(8);
  });

  it("includes terminal statuses", () => {
    expect(APP_STATUSES).toContain("winner");
    expect(APP_STATUSES).toContain("rejected");
  });

  it("includes initial status", () => {
    expect(APP_STATUSES).toContain("new");
  });

  it("includes review pipeline", () => {
    expect(APP_STATUSES).toContain("review");
    expect(APP_STATUSES).toContain("scoring");
    expect(APP_STATUSES).toContain("finalist");
  });
});

describe("User roles", () => {
  it("has 4 roles", () => {
    expect(ROLES.length).toBe(4);
  });

  it("includes superadmin", () => {
    expect(ROLES).toContain("superadmin");
  });

  it("includes jury", () => {
    expect(ROLES).toContain("jury");
  });
});

describe("Status labels mapping", () => {
  const LABELS: Record<string, string> = {
    new: "Отправлена",
    queued: "Ожидает",
    review: "На рассмотрении",
    revision: "Доработка",
    scoring: "На оценке",
    finalist: "Финалист",
    winner: "Победитель",
    rejected: "Отклонена",
  };

  it("has label for every status", () => {
    for (const status of APP_STATUSES) {
      expect(LABELS[status]).toBeTruthy();
    }
  });

  it("all labels are in Russian", () => {
    for (const label of Object.values(LABELS)) {
      expect(label).toMatch(/[а-яА-ЯёЁ]/);
    }
  });
});
