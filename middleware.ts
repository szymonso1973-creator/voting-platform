import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionToken } from "@/lib/admin-session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get("admin_session")?.value;
  const isLoginPage = pathname.startsWith("/admin/login");
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPublicAdminAuthApi = pathname.startsWith("/api/admin/auth/login") || pathname.startsWith("/api/admin/auth/me");

  const hasValidSession = raw ? Boolean(verifyAdminSessionToken(raw)) : false;

  if (isAdminPage && !isLoginPage && !hasValidSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isAdminApi && !isPublicAdminAuthApi && !hasValidSession) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
