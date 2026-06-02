import { NextRequest, NextResponse } from "next/server";
import { changePassword, publicUser, signUserToken } from "@/backend/infrastructure/auth/accessStore";
import { requireAuth } from "@/backend/presentation/middlewares/authorization";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.response || !auth.user) return auth.response;

  const { currentPassword, newPassword } = await request.json();
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "A nova senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  }

  try {
    const updatedUser = await changePassword(auth.user, String(currentPassword ?? ""), newPassword);
    const token = signUserToken(updatedUser);
    const response = NextResponse.json({ user: publicUser(updatedUser), token });
    response.cookies.set("sisapec_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao alterar senha." }, { status: 400 });
  }
}
