import "dotenv/config";
import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { hashSync } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../lib/generated/prisma/client";

/**
 * Создание реальных профилей оргкомитета/жюри Премии.
 * — генерирует случайный пароль каждому НОВОМУ пользователю (существующих не трогает);
 * — печатает логины/пароли и сохраняет их в gitignored-файл prisma/.created-users.local.txt;
 * — пароли в git НЕ попадают.
 * Запуск: npx tsx prisma/create-users.ts
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const staff: { fio: string; email: string; role: Role }[] = [
  { fio: "Яковлев Артём Сергеевич", email: "yakovlev@trudkrut.ru", role: "superadmin" },
  { fio: "Позднякова Юлия Евгеньевна", email: "pozdnyakova@trudkrut.ru", role: "admin" },
  { fio: "Джанхотова Анна Васильевна", email: "dzhankhotova@trudkrut.ru", role: "admin" },
  { fio: "Колачевская Божена Андреевна", email: "kolachevskaya@trudkrut.ru", role: "admin" },
  { fio: "Олейникова Анна Анатольевна", email: "oleynikova@trudkrut.ru", role: "admin" },
  { fio: "Горлышкина Злата Юрьевна", email: "gorlyshkina@trudkrut.ru", role: "admin" },
  { fio: "Печникова Ксения Леонидовна", email: "pechnikova@trudkrut.ru", role: "admin" },
];

// Пароль без визуально похожих символов (без O/0/I/l/1).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function genPassword(len = 12): string {
  let p = "";
  for (let i = 0; i < len; i++) p += ALPHABET[randomInt(ALPHABET.length)];
  return p;
}

async function main() {
  const created: { fio: string; email: string; role: string; password: string }[] = [];
  for (const u of staff) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      // не сбрасываем пароль существующему; при необходимости роль/ФИО обновим
      await prisma.user.update({
        where: { email: u.email },
        data: { fio: u.fio, role: u.role },
      });
      console.log(`= уже есть: ${u.email} (роль обновлена: ${u.role})`);
      continue;
    }
    const password = genPassword();
    await prisma.user.create({
      data: { fio: u.fio, email: u.email, role: u.role, passwordHash: hashSync(password, 10) },
    });
    created.push({ fio: u.fio, email: u.email, role: u.role, password });
    console.log(`+ создан: ${u.email} (${u.role})`);
  }

  if (created.length) {
    const lines = created.map(
      (c) => `${c.email}\t${c.password}\t${c.role}\t${c.fio}`,
    );
    const dump =
      "email\tпароль\tроль\tФИО\n" + lines.join("\n") + "\n";
    writeFileSync(new URL("./.created-users.local.txt", import.meta.url), dump, "utf8");
    console.log("\n=== ЛОГИНЫ И ПАРОЛИ (сохранено в prisma/.created-users.local.txt) ===");
    console.log(dump);
  } else {
    console.log("\nНовых пользователей не создано (все уже существуют).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
