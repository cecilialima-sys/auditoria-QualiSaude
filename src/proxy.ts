import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/permissions/permissions";
import { verifyUserTokenPayload } from "@/backend/infrastructure/auth/accessStore";

const routePermissions: Record<string, string> = {
  "/dashboard": "dashboard.view",
  "/sectors": "sectors.view",
  "/audits": "checklists.view",
  "/reports": "reports.view",
  "/metrics": "metrics.view",
  "/action-plans": "records.edit",
  "/evidences": "records.create",
  "/users": "users.manage",
  "/permissions": "permissions.manage",
  "/admin/access-control": "permissions.manage",
  "/settings": "settings.manage",
  "/sisapec-integration": "settings.manage",
  "/audit-logs": "audit_logs.view"
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matched = Object.entries(routePermissions).find(([prefix]) => pathname.startsWith(prefix));
  if (!matched) return NextResponse.next();

  const token = request.cookies.get("sisapec_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const user = verifyUserTokenPayload(token);
    const [, permission] = matched;
    if (user.role !== "ADMIN" && permission === "permissions.manage") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (!hasPermission(user.permissions, permission)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sectors/:path*",
    "/audits/:path*",
    "/reports/:path*",
    "/metrics/:path*",
    "/action-plans/:path*",
    "/evidences/:path*",
    "/users/:path*",
    "/permissions/:path*",
    "/admin/access-control/:path*",
    "/settings/:path*",
    "/sisapec-integration/:path*",
    "/audit-logs/:path*"
  ]
};
