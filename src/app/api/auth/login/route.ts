import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, publicUser, signUserToken } from "@/backend/infrastructure/auth/accessStore";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const user = typeof email === "string" ? await findUserByEmail(email) : null;

  if (!user || !user.active) {
    return NextResponse.json({ error: "Credenciais inválidas ou usuário inativo." }, { status: 401 });
  }

  const validPassword = await bcrypt.compare(String(password ?? ""), user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const token = signUserToken(user);
  const response = NextResponse.json({ token, user: publicUser(user) });
  response.cookies.set("sisapec_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
