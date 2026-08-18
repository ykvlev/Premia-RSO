import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { MailingForm } from "@/components/admin/mailing-form";

export const metadata: Metadata = { title: "Рассылка" };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";

/** Массовая рассылка заявителям (админ/суперадмин). */
export default async function MailingPage() {
  await requireRole("admin", "superadmin");

  const nominations = await db.nomination.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <main
      style={{
        flex: 1,
        minHeight: "100vh",
        background: "#08080a",
        fontFamily: F,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 28px 80px" }}>
        <h1
          style={{
            color: "#f2f0ec",
            fontSize: 26,
            fontWeight: 800,
            margin: "0 0 6px",
          }}
        >
          Массовая рассылка
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 28px" }}>
          Письмо уйдёт всем заявителям, попадающим под выбранный фильтр. Проверьте
          получателей перед отправкой — отменить рассылку нельзя.
        </p>
        <MailingForm nominations={nominations} />
      </div>
    </main>
  );
}
