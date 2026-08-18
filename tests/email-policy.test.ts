import { describe, it, expect } from "vitest";
import { checkEmailPolicy, isEmailAllowed } from "@/lib/email-policy";

describe("checkEmailPolicy", () => {
  it("блокирует зарубежные личные сервисы", () => {
    for (const e of [
      "a@gmail.com",
      "b@outlook.com",
      "c@yahoo.com",
      "d@proton.me",
      "e@icloud.com",
      "f@qq.com",
    ]) {
      expect(checkEmailPolicy(e).ok, e).toBe(false);
    }
  });

  it("пропускает российские и корпоративные домены", () => {
    for (const e of ["a@mail.ru", "b@yandex.ru", "c@trudkrut.ru", "d@rso-company.org"]) {
      expect(checkEmailPolicy(e).ok, e).toBe(true);
    }
  });

  it("отклоняет некорректные адреса", () => {
    for (const e of ["", "no-at", "@nodomain.com", "trailing@"]) {
      expect(checkEmailPolicy(e).ok, e).toBe(false);
    }
  });

  it("нечувствителен к регистру", () => {
    expect(checkEmailPolicy("USER@GMAIL.COM").ok).toBe(false);
    expect(checkEmailPolicy("USER@MAIL.RU").ok).toBe(true);
  });

  it("isEmailAllowed повторяет .ok", () => {
    expect(isEmailAllowed("x@mail.ru")).toBe(true);
    expect(isEmailAllowed("x@gmail.com")).toBe(false);
  });
});
