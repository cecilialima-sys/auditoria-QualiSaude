import { NextRequest, NextResponse } from "next/server";
import { getAccessUsers, getAdminLogs, publicUser } from "@/backend/infrastructure/auth/accessStore";
import { requireAdmin } from "@/backend/presentation/middlewares/authorization";
import { permissionCatalog, rolePermissionDefaults } from "@/lib/permissions/permissions";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  return NextResponse.json({
    currentUser: auth.user ? publicUser(auth.user) : null,
    users: (await getAccessUsers()).map(publicUser),
    permissions: permissionCatalog,
    rolePermissionDefaults,
    logs: (await getAdminLogs()).slice(0, 20)
  });
}
