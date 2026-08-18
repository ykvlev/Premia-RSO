import { describe, it, expect } from "vitest";
import {
  commonFieldsSchema,
  buildPayloadSchema,
  fileFields,
  type FormField,
} from "@/lib/application-schema";

const validCommon = {
  nominationId: "n1",
  orgName: "ООО Ромашка",
  inn: "7700000000",
  region: "Москва",
  contactFio: "Иванов Иван Иванович",
  phone: "+7 900 000-00-00",
  email: "test@mail.ru",
  consent: true,
};

describe("commonFieldsSchema", () => {
  it("принимает корректные данные", () => {
    expect(commonFieldsSchema.safeParse(validCommon).success).toBe(true);
  });

  it("принимает 12-значный ИНН", () => {
    expect(commonFieldsSchema.safeParse({ ...validCommon, inn: "770000000000" }).success).toBe(true);
  });

  it("отклоняет некорректный ИНН", () => {
    for (const inn of ["123", "abcdefghij", "77000000001"]) {
      expect(commonFieldsSchema.safeParse({ ...validCommon, inn }).success, inn).toBe(false);
    }
  });

  it("требует согласие = true", () => {
    expect(commonFieldsSchema.safeParse({ ...validCommon, consent: false }).success).toBe(false);
  });

  it("отклоняет неверный формат email", () => {
    expect(commonFieldsSchema.safeParse({ ...validCommon, email: "не-почта" }).success).toBe(false);
  });

  it("отклоняет короткое ФИО", () => {
    expect(commonFieldsSchema.safeParse({ ...validCommon, contactFio: "Ян" }).success).toBe(false);
  });
});

describe("buildPayloadSchema", () => {
  const fields: FormField[] = [
    { name: "title", label: "Заголовок", type: "text", required: true },
    { name: "count", label: "Кол-во", type: "number", required: true },
    { name: "level", label: "Уровень", type: "select", required: true, options: ["A", "B"] },
    { name: "site", label: "Сайт", type: "url", required: false },
    { name: "doc", label: "Документ", type: "file", required: true },
  ];
  const schema = buildPayloadSchema(fields);

  it("игнорирует файловые поля в схеме", () => {
    expect(schema.safeParse({ title: "x", count: "5", level: "A" }).success).toBe(true);
  });

  it("приводит число и отклоняет отрицательное", () => {
    expect(schema.safeParse({ title: "x", count: "5", level: "A" }).success).toBe(true);
    expect(schema.safeParse({ title: "x", count: "-1", level: "A" }).success).toBe(false);
  });

  it("отклоняет select вне списка", () => {
    expect(schema.safeParse({ title: "x", count: "5", level: "Z" }).success).toBe(false);
  });

  it("требует заполнения обязательного текста", () => {
    expect(schema.safeParse({ title: "", count: "5", level: "A" }).success).toBe(false);
  });

  it("разрешает пустой необязательный url", () => {
    expect(schema.safeParse({ title: "x", count: "5", level: "A", site: "" }).success).toBe(true);
  });
});

describe("fileFields", () => {
  it("возвращает только поля типа file", () => {
    const fs: FormField[] = [
      { name: "a", label: "", type: "text" },
      { name: "b", label: "", type: "file" },
      { name: "c", label: "", type: "file" },
    ];
    expect(fileFields(fs).map((f) => f.name)).toEqual(["b", "c"]);
  });
});
