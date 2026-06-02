import { NextRequest, NextResponse } from "next/server";
import { createAccessUser, publicUser, type AccessRole } from "@/backend/infrastructure/auth/accessStore";
import { requireAdmin } from "@/backend/presentation/middlewares/authorization";
import { roleLabels } from "@/lib/permissions/permissions";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth.response || !auth.user) return auth.response;

  const body = await request.json();
  const role = body.role as AccessRole;
  if (!body.name || !body.email || !body.password || !(role in roleLabels)) {
    return NextResponse.json({ error: "Dados de usuário inválidos." }, { status: 400 });
  }

  try {
    const user = await createAccessUser(
      auth.user,
      { name: body.name, email: body.email, password: body.password, role },
      request.headers.get("x-forwarded-for") ?? undefined
    );
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao criar usuário." }, { status: 400 });
  }
}
