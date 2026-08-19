import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Профиль участника" };

const F = "var(--font-onest), sans-serif";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let user = null;
  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        fio: true,
        email: true,
        phone: true,
        gender: true,
        birthDate: true,
        city: true,
        region: true,
        telegram: true,
        vkUrl: true,
        avatarUrl: true,
        emailVerified: true,
      },
    });
  } catch {
    // dev without DB
  }

  if (!user) redirect("/login");

  return (
    <main
      style={{
        flex: 1,
        minHeight: "100vh",
        background: "#08080a",
        position: "relative",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(680px circle at 50% -10%, rgba(8,4,255,0.1), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero-wordmark.svg"
            alt="Труд Крут"
            style={{ display: "block", width: 140, height: "auto" }}
          />
        </div>

        <h1
          style={{
            color: "#f2f0ec",
            fontSize: 30,
            fontFamily: F,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "0.5px",
            marginBottom: 8,
          }}
        >
          Профиль участника
        </h1>
        <p
          style={{
            color: "#9a9aa4",
            fontSize: 14,
            fontFamily: F,
            lineHeight: 1.5,
            marginBottom: 28,
          }}
        >
          Заполните данные для подачи заявок на премию.
        </p>

        <div
          style={{
            background: "#121216",
            border: "1px solid #2a2a32",
            borderRadius: 16,
            padding: "28px 26px",
          }}
        >
          <ProfileForm user={user} />
        </div>

        <p
          style={{
            color: "#4a4a56",
            fontSize: 12,
            fontFamily: F,
            textAlign: "center",
            marginTop: 24,
          }}
        >
          Национальная премия «Труд крут»
        </p>
      </div>
    </main>
  );
}
