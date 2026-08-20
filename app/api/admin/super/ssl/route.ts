import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("superadmin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const host = process.env.NEXT_PUBLIC_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_BASE_URL).hostname
      : "localhost";

    const raw = execSync(
      `echo | openssl s_client -servername ${host} -connect ${host}:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject -serial 2>/dev/null`,
      { encoding: "utf8", timeout: 10000 }
    );

    const extract = (line: string) => raw.split("\n").find((l) => l.startsWith(line))?.split("=").slice(1).join("=").trim() ?? "";

    const notBefore = extract("notBefore");
    const notAfter = extract("notAfter");
    const issuer = extract("issuer").replace(/.*CN\s*=\s*/, "").replace(/\/.*/, "");
    const subject = extract("subject").replace(/.*CN\s*=\s*/, "").replace(/\/.*/, "");
    const serial = extract("serial");

    const validFrom = new Date(notBefore);
    const validTo = new Date(notAfter);
    const daysLeft = Math.round((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      issuer,
      subject,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      daysLeft,
      serialNumber: serial,
    });
  } catch (e: any) {
    return NextResponse.json({
      issuer: "—",
      subject: "—",
      validFrom: "",
      validTo: "",
      daysLeft: 0,
      serialNumber: "",
      error: e.message?.includes("connect") ? "Не удалось подключиться к серверу" : "Сертификат не найден",
    });
  }
}
