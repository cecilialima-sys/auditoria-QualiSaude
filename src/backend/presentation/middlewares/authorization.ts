import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken, type AccessUser } from "@/backend/infrastructure/auth/accessStore";
import { hasPermission } from "@/lib/permissions/permissions";

export async function getRequestUser(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const cookieToken = request.cookies.get("sisapec_token")?.value;
  const token = bearer || cookieToken;
  if (!token) return null;

  try {
    return await verifyUserToken(token);
  } catch {
    return null;
  }
}

export function unauthorized(message = "Acesso nao autorizado.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Permissao insuficiente.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAuth(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { response: unauthorized(), user: null };
  if (!user.active) return { response: forbidden("Usuario inativo."), user: null };
  return { response: null, user };
}

export async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response || !auth.user) return auth;
  if (auth.user.role !== "ADMIN") return { response: forbidden("Apenas ADMIN pode acessar esta rota."), user: null };
  if (auth.user.mustChangePassword) {
    return { response: forbidden("Altere a senha inicial antes de acessar o painel administrativo."), user: null };
  }
  return { response: null, user: auth.user };
}

export async function requirePermission(request: NextRequest, permission: string) {
  const auth = await requireAuth(request);
  if (auth.response || !auth.user) return auth;
  if (!hasPermission(auth.user.permissions, permission)) {
    return { response: forbidden(`Permissao necessaria: ${permission}`), user: null };
  }
  return { response: null, user: auth.user as AccessUser };
}
