import { NextRequest, NextResponse } from "next/server";
import { deleteAccessUser, publicUser, updateUserRole, type AccessRole } from "@/backend/infrastructure/auth/accessStore";
import { requireAdmin } from "@/backend/presentation/middlewares/authorization";
import { roleLabels } from "@/lib/permissions/permissions";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const { role } = await request.json();
  if (!(role in roleLabels)) return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });

  try {
    const updated = await updateUserRole(auth.user, id, role as AccessRole, request.headers.get("x-forwarded-for") ?? undefined);
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao editar usuário." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  try {
    await deleteAccessUser(auth.user, id, request.headers.get("x-forwarded-for") ?? undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao excluir usuário." }, { status: 400 });
  }
}
