import { NextRequest, NextResponse } from "next/server";
import { updateUserPermissions, publicUser } from "@/backend/infrastructure/auth/accessStore";
import { requireAdmin } from "@/backend/presentation/middlewares/authorization";
import { allPermissionKeys } from "@/lib/permissions/permissions";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const { permissions } = await request.json();
  if (!Array.isArray(permissions) || permissions.some((permission) => !allPermissionKeys.includes(permission))) {
    return NextResponse.json({ error: "Lista de permissões inválida." }, { status: 400 });
  }

  try {
    const updated = await updateUserPermissions(auth.user, id, permissions, request.headers.get("x-forwarded-for") ?? undefined);
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao atualizar permissões." }, { status: 400 });
  }
}
