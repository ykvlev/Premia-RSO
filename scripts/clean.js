import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "./lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const a = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter: a });
(async()=>{
  const participants = await p.user.findMany({ where: { role: "participant" }, select: { id: true, email: true } });
  console.log(`Found ${participants.length} participants`);
  for (const u of participants) {
    const apps = await p.application.findMany({ where: { OR: [{ userId: u.id }, { email: u.email }] }, select: { id: true } });
    const appIds = apps.map(a=>a.id);
    console.log(`Deleting ${u.email} with ${appIds.length} apps`);
    await p.$transaction(async(tx)=>{
      if(appIds.length>0){
        await tx.attachment.deleteMany({ where: { applicationId: { in: appIds } } });
        await tx.applicationComment.deleteMany({ where: { applicationId: { in: appIds } } });
        await tx.applicationEvent.deleteMany({ where: { applicationId: { in: appIds } } });
        await tx.evaluation.deleteMany({ where: { applicationId: { in: appIds } } });
        await tx.juryRecusal.deleteMany({ where: { applicationId: { in: appIds } } });
        await tx.application.deleteMany({ where: { id: { in: appIds } } });
      }
      await tx.evaluation.deleteMany({ where: { juryUserId: u.id } });
      await tx.juryAssignment.deleteMany({ where: { juryUserId: u.id } });
      await tx.juryRecusal.deleteMany({ where: { juryUserId: u.id } });
      await tx.notification.deleteMany({ where: { userId: u.id } });
      await tx.passwordReset.deleteMany({ where: { email: u.email } });
      await tx.loginEvent.deleteMany({ where: { email: u.email } });
      await tx.user.delete({ where: { id: u.id } });
    });
    console.log(`Deleted ${u.email}`);
  }
  const email = "test.participant@trudkrut.ru";
  const fio = "Тестовый Участник";
  const pw = "TrudKrut2026!";
  const h = await hash(pw, 12);
  const existing = await p.user.findUnique({ where: { email } });
  if(existing) await p.user.delete({ where: { email } });
  const u = await p.user.create({ data: { email, fio, role: "participant", passwordHash: h, phone: "+79999999999", gender: "Мужской", birthDate: new Date("2000-01-01"), city: "Москва", region: "Москва", emailVerified: new Date() } });
  console.log(`Created test participant ${u.email} / ${pw} id=${u.id}`);
  await p.$disconnect();
})();
