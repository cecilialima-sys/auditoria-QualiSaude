import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/permissions/permissions";
import { verifyUserToken, type AccessUser } from "@/backend/infrastructure/auth/accessStore";

export function getRequestUser(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const cookieToken = request.cookies.get("sisapec_token")?.value;
  const token = bearer || cookieToken;
  if (!token) return null;

  try {
    return verifyUserToken(token);
  } catch {
    return null;
  }
}

export function unauthorized(message = "Acesso não autorizado.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Permissão insuficiente.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function requireAuth(request: NextRequest) {
  const user = getRequestUser(request);
  if (!user) return { response: unauthorized(), user: null };
  if (!user.active) return { response: forbidden("Usuário inativo."), user: null };
  return { response: null, user };
}

export function requireAdmin(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.response || !auth.user) return auth;
  if (auth.user.role !== "ADMIN") return { response: forbidden("Apenas ADMIN pode acessar esta rota."), user: null };
  if (auth.user.mustChangePassword) {
    return { response: forbidden("Altere a senha inicial antes de acessar o painel administrativo."), user: null };
  }
  return { response: null, user: auth.user };
}

export function requirePermission(request: NextRequest, permission: string) {
  const auth = requireAuth(request);
  if (auth.response || !auth.user) return auth;
  if (!hasPermission(auth.user.permissions, permission)) {
    return { response: forbidden(`Permissão necessária: ${permission}`), user: null };
  }
  return { response: null, user: auth.user as AccessUser };
}
