import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Заявка отправлена" };

/** Подтверждение отправки (SPEC §5: /apply/success). */
export default async function ApplySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <main className="flex-1 px-6 py-12 md:px-12">
      <p className="hud-label mb-4">{brand.org} · заявка отправлена</p>
      <h1 className="font-display mb-8 text-3xl uppercase md:text-5xl">Заявка принята</h1>

      <div className="max-w-xl space-y-4">
        {id && (
          <div className="border border-black">
            <div className="border-b border-black bg-[color:var(--color-rso-gray)] px-4 py-2">
              <span className="hud-label">номер заявки</span>
            </div>
            <p className="numeric px-4 py-3 text-lg break-all">{id}</p>
          </div>
        )}
        <p className="text-lg leading-relaxed">
          Подтверждение отправлено на указанный email. Оргкомитет свяжется с вами по
          результатам рассмотрения.
        </p>
      </div>

      <p className="mt-10">
        <Link href="/" className="text-sm underline underline-offset-4">
          ← На главную
        </Link>
      </p>
    </main>
  );
}
