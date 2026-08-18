import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ParticipantLogin } from "@/components/participant-login";

export const metadata: Metadata = { title: "Вход в личный кабинет" };

/** Вход для участников. Уже вошёл — уводим по роли. */
export default async function ParticipantLoginPage() {
  const session = await auth();
  if (session?.user) {
    const target =
      session.user.role === "jury"
        ? "/jury"
        : session.user.role === "admin" || session.user.role === "superadmin"
          ? "/admin"
          : "/cabinet";
    redirect(target);
  }
  return <ParticipantLogin />;
}
