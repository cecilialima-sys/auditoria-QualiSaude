import { NextRequest, NextResponse } from "next/server";
import { publicUser, resetUserPassword } from "@/backend/infrastructure/auth/accessStore";
import { requireAdmin } from "@/backend/presentation/middlewares/authorization";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const { password } = await request.json();
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "A senha temporária deve ter pelo menos 8 caracteres." }, { status: 400 });
  }

  try {
    const updated = await resetUserPassword(auth.user, id, password, request.headers.get("x-forwarded-for") ?? undefined);
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao redefinir senha." }, { status: 400 });
  }
}
