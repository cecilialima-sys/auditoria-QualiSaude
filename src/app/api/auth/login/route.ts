import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, publicUser, signUserToken } from "@/backend/infrastructure/auth/accessStore";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const user = typeof email === "string" ? await findUserByEmail(email) : null;

    if (!user || !user.active) {
      return NextResponse.json({ error: "Credenciais invalidas ou usuario inativo." }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(String(password ?? ""), user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
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
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel validar o login agora. Verifique a conexao com o banco e tente novamente." },
      { status: 503 }
    );
  }
}
