import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FLAG_PATH = join(process.cwd(), "MAINTENANCE.flag");

function isMaintenanceActive(): boolean {
  return existsSync(FLAG_PATH);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: API routes, static files, admin
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/brand") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  if (isMaintenanceActive()) {
    // Serve the maintenance page
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|admin|brand|favicon.ico|.*\\..*).*)"],
};
