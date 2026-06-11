import { NextRequest, NextResponse } from "next/server";
import { updateUserStatus, publicUser } from "@/backend/infrastructure/auth/accessStore";
import { requireAdmin } from "@/backend/presentation/middlewares/authorization";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const { active } = await request.json();
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  try {
    const updated = await updateUserStatus(auth.user, id, active, request.headers.get("x-forwarded-for") ?? undefined);
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao alterar status." }, { status: 400 });
  }
}
