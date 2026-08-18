import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
async function main() {
  await prisma.attachment.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.juryAssignment.deleteMany();
  await prisma.application.deleteMany();
  await prisma.nomination.deleteMany();
  console.log("dev-данные заявок и номинации очищены");
}
main().finally(() => prisma.$disconnect());
