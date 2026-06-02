import bcrypt from "bcryptjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import jwt from "jsonwebtoken";
import { dirname, join } from "path";
import { allPermissionKeys, rolePermissionDefaults } from "@/lib/permissions/permissions";

export type AccessRole = "ADMIN" | "COORDENADOR" | "AUDITOR" | "ENFERMEIRO" | "VISUALIZADOR" | "USUARIO_COMUM";

export type AccessUser = {
  id: string;
  name: string;
  email: string;
  role: AccessRole;
  active: boolean;
  isPrimaryAdmin: boolean;
  mustChangePassword: boolean;
  permissions: string[];
  passwordHash: string;
};

export type AuditAdminLog = {
  id: string;
  actorEmail: string;
  targetEmail: string;
  action: string;
  changedPermissions: string[];
  ip?: string;
  createdAt: string;
};

const globalState = globalThis as typeof globalThis & {
  sisapecAccessUsers?: AccessUser[];
  sisapecAdminLogs?: AuditAdminLog[];
};

const storePath = join(process.cwd(), "data", "access-store.json");

type PersistedAccessStore = {
  users: AccessUser[];
  logs: AuditAdminLog[];
};

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL e ADMIN_PASSWORD devem estar definidos nas variáveis de ambiente.");
  }
  return { email, password };
}

function createInitialUsers() {
  const admin = getAdminCredentials();
  return [
    {
      id: "usr-primary-admin",
      name: "Cecilia Lima",
      email: admin.email,
      role: "ADMIN" as const,
      active: true,
      isPrimaryAdmin: true,
      mustChangePassword: true,
      permissions: [...allPermissionKeys],
      passwordHash: bcrypt.hashSync(admin.password, 12)
    }
  ];
}

function readPersistedStore() {
  if (!existsSync(storePath)) return null;
  try {
    return JSON.parse(readFileSync(storePath, "utf8")) as PersistedAccessStore;
  } catch {
    return null;
  }
}

function saveAccessStore() {
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(
    storePath,
    JSON.stringify(
      {
        users: globalState.sisapecAccessUsers ?? [],
        logs: globalState.sisapecAdminLogs ?? []
      },
      null,
      2
    )
  );
}

function ensurePrimaryAdmin(users: AccessUser[]) {
  const admin = getAdminCredentials();
  const existing = users.find((user) => user.email.toLowerCase() === admin.email.toLowerCase());
  if (existing) {
    existing.role = "ADMIN";
    existing.active = true;
    existing.isPrimaryAdmin = true;
    existing.permissions = [...allPermissionKeys];
    return users;
  }

  users.unshift({
    id: "usr-primary-admin",
    name: "Cecilia Lima",
    email: admin.email,
    role: "ADMIN",
    active: true,
    isPrimaryAdmin: true,
    mustChangePassword: true,
    permissions: [...allPermissionKeys],
    passwordHash: bcrypt.hashSync(admin.password, 12)
  });
  return users;
}

export function getAccessUsers() {
  if (!globalState.sisapecAccessUsers) {
    const persisted = readPersistedStore();
    globalState.sisapecAccessUsers = ensurePrimaryAdmin(persisted?.users ?? createInitialUsers());
    globalState.sisapecAdminLogs = persisted?.logs ?? [];
    saveAccessStore();
  }
  return globalState.sisapecAccessUsers;
}

export function getAdminLogs() {
  if (!globalState.sisapecAdminLogs) {
    globalState.sisapecAdminLogs = [];
  }
  return globalState.sisapecAdminLogs;
}

export function findUserByEmail(email: string) {
  return getAccessUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string) {
  return getAccessUsers().find((user) => user.id === id);
}

export function publicUser(user: AccessUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    isPrimaryAdmin: user.isPrimaryAdmin,
    mustChangePassword: user.mustChangePassword,
    permissions: user.permissions
  };
}

export function signUserToken(user: AccessUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, permissions: user.permissions },
    process.env.JWT_SECRET ?? "dev-secret",
    { expiresIn: "8h" }
  );
}

export function verifyUserToken(token: string) {
  const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as { sub: string };
  const user = findUserById(payload.sub);
  if (!user || !user.active) return null;
  return user;
}

export function updateUserPermissions(actor: AccessUser, targetId: string, permissions: string[], ip?: string) {
  const target = findUserById(targetId);
  if (!target) throw new Error("Usuário não encontrado.");
  if (target.isPrimaryAdmin && actor.id !== target.id) {
    throw new Error("O ADMIN principal não pode ter permissões alteradas por outro usuário.");
  }
  target.permissions = [...new Set(permissions)];
  getAdminLogs().unshift({
    id: crypto.randomUUID(),
    actorEmail: actor.email,
    targetEmail: target.email,
    action: "ALTEROU_PERMISSOES",
    changedPermissions: target.permissions,
    ip,
    createdAt: new Date().toISOString()
  });
  saveAccessStore();
  return target;
}

export function updateUserStatus(actor: AccessUser, targetId: string, active: boolean, ip?: string) {
  const target = findUserById(targetId);
  if (!target) throw new Error("Usuário não encontrado.");
  if (target.isPrimaryAdmin) throw new Error("O ADMIN principal não pode ser desativado.");
  if (!active && target.role === "ADMIN") {
    const activeAdmins = getAccessUsers().filter((user) => user.role === "ADMIN" && user.active && user.id !== target.id);
    if (!activeAdmins.length) throw new Error("Deve existir pelo menos um ADMIN ativo.");
  }
  target.active = active;
  getAdminLogs().unshift({
    id: crypto.randomUUID(),
    actorEmail: actor.email,
    targetEmail: target.email,
    action: active ? "ATIVOU_USUARIO" : "DESATIVOU_USUARIO",
    changedPermissions: [],
    ip,
    createdAt: new Date().toISOString()
  });
  saveAccessStore();
  return target;
}

export async function createAccessUser(actor: AccessUser, input: { name: string; email: string; role: AccessRole; password: string }, ip?: string) {
  if (findUserByEmail(input.email)) throw new Error("E-mail já cadastrado.");
  const user: AccessUser = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    role: input.role,
    active: true,
    isPrimaryAdmin: false,
    mustChangePassword: true,
    permissions: [...(rolePermissionDefaults[input.role] ?? [])],
    passwordHash: await bcrypt.hash(input.password, 12)
  };
  getAccessUsers().push(user);
  getAdminLogs().unshift({
    id: crypto.randomUUID(),
    actorEmail: actor.email,
    targetEmail: user.email,
    action: "CRIOU_USUARIO",
    changedPermissions: user.permissions,
    ip,
    createdAt: new Date().toISOString()
  });
  saveAccessStore();
  return user;
}

export function updateUserRole(actor: AccessUser, targetId: string, role: AccessRole, ip?: string) {
  const target = findUserById(targetId);
  if (!target) throw new Error("Usuário não encontrado.");
  if (target.isPrimaryAdmin && actor.id !== target.id) {
    throw new Error("O ADMIN principal não pode ter o perfil alterado por outro usuário.");
  }
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const activeAdmins = getAccessUsers().filter((user) => user.role === "ADMIN" && user.active && user.id !== target.id);
    if (!activeAdmins.length) throw new Error("Deve existir pelo menos um ADMIN ativo.");
  }
  target.role = role;
  target.permissions = [...(rolePermissionDefaults[role] ?? target.permissions)];
  getAdminLogs().unshift({
    id: crypto.randomUUID(),
    actorEmail: actor.email,
    targetEmail: target.email,
    action: "ALTEROU_PERFIL",
    changedPermissions: target.permissions,
    ip,
    createdAt: new Date().toISOString()
  });
  saveAccessStore();
  return target;
}

export function deleteAccessUser(actor: AccessUser, targetId: string, ip?: string) {
  const users = getAccessUsers();
  const target = findUserById(targetId);
  if (!target) throw new Error("Usuário não encontrado.");
  if (target.isPrimaryAdmin) throw new Error("O ADMIN principal não pode ser excluído.");
  if (target.role === "ADMIN") {
    const activeAdmins = users.filter((user) => user.role === "ADMIN" && user.active && user.id !== target.id);
    if (!activeAdmins.length) throw new Error("Deve existir pelo menos um ADMIN ativo.");
  }
  globalState.sisapecAccessUsers = users.filter((user) => user.id !== targetId);
  getAdminLogs().unshift({
    id: crypto.randomUUID(),
    actorEmail: actor.email,
    targetEmail: target.email,
    action: "EXCLUIU_USUARIO",
    changedPermissions: [],
    ip,
    createdAt: new Date().toISOString()
  });
  saveAccessStore();
}

export async function resetUserPassword(actor: AccessUser, targetId: string, newPassword: string, ip?: string) {
  const target = findUserById(targetId);
  if (!target) throw new Error("Usuário não encontrado.");
  if (target.isPrimaryAdmin && actor.id !== target.id) {
    throw new Error("A senha do ADMIN principal não pode ser redefinida por outro usuário.");
  }
  target.passwordHash = await bcrypt.hash(newPassword, 12);
  target.mustChangePassword = true;
  getAdminLogs().unshift({
    id: crypto.randomUUID(),
    actorEmail: actor.email,
    targetEmail: target.email,
    action: "REDEFINIU_SENHA",
    changedPermissions: [],
    ip,
    createdAt: new Date().toISOString()
  });
  saveAccessStore();
  return target;
}

export async function changePassword(user: AccessUser, currentPassword: string, newPassword: string) {
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Senha atual inválida.");
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  getAdminLogs().unshift({
    id: crypto.randomUUID(),
    actorEmail: user.email,
    targetEmail: user.email,
    action: "ALTEROU_PROPRIA_SENHA",
    changedPermissions: [],
    createdAt: new Date().toISOString()
  });
  saveAccessStore();
  return user;
}
