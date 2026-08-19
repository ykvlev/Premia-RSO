import { describe, it, expect } from "vitest";

const NOMINATIONS = [
  { id: "01", title: "Лучший боец студенческого отряда" },
  { id: "02", title: "Лучшие СМИ о студенческих отрядах" },
  { id: "03", title: "Лучший вуз-партнёр" },
  { id: "04", title: "Лучший ссуз-партнёр" },
  { id: "05", title: "Лучшее региональное отделение РСО" },
  { id: "06", title: "Лучшее содействие органов власти" },
  { id: "07", title: "Наставник года" },
  { id: "08", title: "Лучший работодатель" },
  { id: "09", title: "Лучший социальный партнёр" },
  { id: "10", title: "Лучший проект регионального отделения" },
  { id: "11", title: "Лучший штаб регионального отделения" },
];

const CRITERIA: Record<string, { label: string; max: number }[]> = {
  "01": [
    { label: "Профессиональные достижения", max: 30 },
    { label: "Общественная активность", max: 25 },
    { label: "Медийность", max: 20 },
    { label: "Масштаб деятельности", max: 15 },
    { label: "Качество описания", max: 10 },
  ],
  "02": [
    { label: "Охват аудитории", max: 25 },
    { label: "Качество публикаций", max: 25 },
    { label: "Соответствие тематике", max: 25 },
    { label: "Взаимодействие с РСО", max: 25 },
  ],
};

describe("Nominations", () => {
  it("has 11 nominations", () => {
    expect(NOMINATIONS.length).toBe(11);
  });

  it("each nomination has id and title", () => {
    for (const n of NOMINATIONS) {
      expect(n.id).toBeTruthy();
      expect(n.title).toBeTruthy();
    }
  });

  it("nomination IDs are zero-padded 2-digit strings", () => {
    for (const n of NOMINATIONS) {
      expect(n.id).toMatch(/^\d{2}$/);
    }
  });

  it("first nomination is best fighter", () => {
    expect(NOMINATIONS[0].title).toContain("боец");
  });
});

describe("Criteria", () => {
  it("nomination 01 criteria sum to 100", () => {
    const total = CRITERIA["01"].reduce((s, c) => s + c.max, 0);
    expect(total).toBe(100);
  });

  it("nomination 02 criteria sum to 100", () => {
    const total = CRITERIA["02"].reduce((s, c) => s + c.max, 0);
    expect(total).toBe(100);
  });

  it("each criterion has label and max > 0", () => {
    for (const criteria of Object.values(CRITERIA)) {
      for (const c of criteria) {
        expect(c.label).toBeTruthy();
        expect(c.max).toBeGreaterThan(0);
      }
    }
  });
});
