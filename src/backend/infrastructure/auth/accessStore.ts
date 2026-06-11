import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPrismaClient } from "@/backend/infrastructure/database/prismaClient";
import { allPermissionKeys, permissionCatalog, roleLabels, rolePermissionDefaults } from "@/lib/permissions/permissions";

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

type DbUser = Awaited<ReturnType<typeof findDbUserById>>;

function db() {
  return getPrismaClient();
}

const accessCatalogState = globalThis as typeof globalThis & {
  sisapecAccessCatalogPromise?: Promise<void>;
};

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL e ADMIN_PASSWORD devem estar definidos nas variaveis de ambiente.");
  }
  return { email, password };
}

async function ensureAccessCatalog() {
  if (!accessCatalogState.sisapecAccessCatalogPromise) {
    accessCatalogState.sisapecAccessCatalogPromise = runAccessCatalogSetup().catch((error) => {
      accessCatalogState.sisapecAccessCatalogPromise = undefined;
      throw error;
    });
  }

  return accessCatalogState.sisapecAccessCatalogPromise;
}

async function runAccessCatalogSetup() {
  const roles = await Promise.all(
    Object.keys(roleLabels).map((name) =>
      db().role.upsert({
        where: { name: name as AccessRole },
        update: {},
        create: { name: name as AccessRole }
      })
    )
  );

  const permissions = await Promise.all(
    permissionCatalog.map((permission) =>
      db().permission.upsert({
        where: { key: permission.key },
        update: { label: permission.label, description: permission.module },
        create: {
          key: permission.key,
          label: permission.label,
          description: permission.module
        }
      })
    )
  );

  for (const role of roles) {
    const defaults = rolePermissionDefaults[role.name as AccessRole] ?? [];
    for (const permissionKey of defaults) {
      const permission = permissions.find((item) => item.key === permissionKey);
      if (!permission) continue;
      await db().rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  const adminCredentials = getAdminCredentials();
  const adminRole = roles.find((role) => role.name === "ADMIN");
  if (!adminRole) throw new Error("Perfil ADMIN nao encontrado.");

  const existingAdmin = await db().user.findUnique({ where: { email: adminCredentials.email } });
  const primaryAdmin = existingAdmin
    ? await db().user.update({
        where: { id: existingAdmin.id },
        data: {
          active: true,
          isPrimaryAdmin: true,
          roleId: adminRole.id,
          deletedAt: null
        }
      })
    : await db().user.create({
        data: {
          name: "Cecilia Lima",
          email: adminCredentials.email,
          passwordHash: await bcrypt.hash(adminCredentials.password, 12),
          roleId: adminRole.id,
          active: true,
          isPrimaryAdmin: true,
          mustChangePassword: true
        }
      });

  for (const permission of permissions) {
    await db().userPermission.upsert({
      where: { userId_permissionId: { userId: primaryAdmin.id, permissionId: permission.id } },
      update: { allowed: true },
      create: { userId: primaryAdmin.id, permissionId: permission.id, allowed: true }
    });
  }
}

async function findDbUserById(id: string) {
  await ensureAccessCatalog();
  return db().user.findFirst({
    where: { id, deletedAt: null },
    include: {
      role: true,
      permissions: {
        where: { allowed: true },
        include: { permission: true }
      }
    }
  });
}

async function findDbUserByEmail(email: string) {
  await ensureAccessCatalog();
  return db().user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    include: {
      role: true,
      permissions: {
        where: { allowed: true },
        include: { permission: true }
      }
    }
  });
}

function toAccessUser(user: NonNullable<DbUser>): AccessUser {
  const permissions = user.isPrimaryAdmin
    ? allPermissionKeys
    : user.permissions.map((permission) => permission.permission.key);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name as AccessRole,
    active: user.active,
    isPrimaryAdmin: user.isPrimaryAdmin,
    mustChangePassword: user.mustChangePassword,
    permissions,
    passwordHash: user.passwordHash
  };
}

async function getPermissionIds(permissionKeys: string[]) {
  await ensureAccessCatalog();
  const permissions = await db().permission.findMany({
    where: { key: { in: permissionKeys } },
    select: { id: true, key: true }
  });

  return permissions;
}

async function replaceUserPermissions(userId: string, permissionKeys: string[]) {
  const permissions = await getPermissionIds([...new Set(permissionKeys)]);
  await db().$transaction([
    db().userPermission.deleteMany({ where: { userId } }),
    db().userPermission.createMany({
      data: permissions.map((permission) => ({
        userId,
        permissionId: permission.id,
        allowed: true
      })),
      skipDuplicates: true
    })
  ]);
}

async function addAdminLog(actor: AccessUser, target: AccessUser, action: string, ip?: string) {
  await db().auditLog.create({
    data: {
      userId: actor.id,
      action,
      entity: target.email,
      entityId: target.id,
      ipAddress: ip
    }
  });
}

async function activeAdminCountExcept(targetId: string) {
  return db().user.count({
    where: {
      id: { not: targetId },
      active: true,
      deletedAt: null,
      role: { name: "ADMIN" }
    }
  });
}

export async function getAccessUsers() {
  await ensureAccessCatalog();
  const users = await db().user.findMany({
    where: { deletedAt: null },
    orderBy: [{ isPrimaryAdmin: "desc" }, { name: "asc" }],
    include: {
      role: true,
      permissions: {
        where: { allowed: true },
        include: { permission: true }
      }
    }
  });

  return users.map(toAccessUser);
}

export async function getAdminLogs() {
  await ensureAccessCatalog();
  const logs = await db().auditLog.findMany({
    where: { action: { in: ["ALTEROU_PERMISSOES", "ATIVOU_USUARIO", "DESATIVOU_USUARIO", "CRIOU_USUARIO", "ALTEROU_PERFIL", "EXCLUIU_USUARIO", "REDEFINIU_SENHA", "ALTEROU_PROPRIA_SENHA"] } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return logs.map((log) => ({
    id: log.id,
    actorEmail: log.user.email,
    targetEmail: log.entity,
    action: log.action,
    changedPermissions: [],
    ip: log.ipAddress ?? undefined,
    createdAt: log.createdAt.toISOString()
  }));
}

export async function findUserByEmail(email: string) {
  const user = await findDbUserByEmail(email);
  return user ? toAccessUser(user) : null;
}

export async function findUserById(id: string) {
  const user = await findDbUserById(id);
  return user ? toAccessUser(user) : null;
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
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      mustChangePassword: user.mustChangePassword
    },
    process.env.JWT_SECRET ?? "dev-secret",
    { expiresIn: "8h" }
  );
}

export function verifyUserTokenPayload(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as {
    sub: string;
    email: string;
    role: AccessRole;
    permissions: string[];
    mustChangePassword?: boolean;
  };
}

export async function verifyUserToken(token: string) {
  const payload = verifyUserTokenPayload(token);
  const user = await findUserById(payload.sub);
  if (!user || !user.active) return null;
  return user;
}

export async function updateUserPermissions(actor: AccessUser, targetId: string, permissions: string[], ip?: string) {
  const target = await findUserById(targetId);
  if (!target) throw new Error("Usuario nao encontrado.");
  if (target.isPrimaryAdmin && actor.id !== target.id) {
    throw new Error("O ADMIN principal nao pode ter permissoes alteradas por outro usuario.");
  }

  await replaceUserPermissions(target.id, permissions);
  const updated = await findUserById(target.id);
  if (!updated) throw new Error("Usuario nao encontrado.");

  await addAdminLog(actor, updated, "ALTEROU_PERMISSOES", ip);
  return updated;
}

export async function updateUserStatus(actor: AccessUser, targetId: string, active: boolean, ip?: string) {
  const target = await findUserById(targetId);
  if (!target) throw new Error("Usuario nao encontrado.");
  if (target.isPrimaryAdmin) throw new Error("O ADMIN principal nao pode ser desativado.");
  if (!active && target.role === "ADMIN") {
    const activeAdmins = await activeAdminCountExcept(target.id);
    if (!activeAdmins) throw new Error("Deve existir pelo menos um ADMIN ativo.");
  }

  await db().user.update({ where: { id: target.id }, data: { active } });
  const updated = await findUserById(target.id);
  if (!updated) throw new Error("Usuario nao encontrado.");

  await addAdminLog(actor, updated, active ? "ATIVOU_USUARIO" : "DESATIVOU_USUARIO", ip);
  return updated;
}

export async function createAccessUser(actor: AccessUser, input: { name: string; email: string; role: AccessRole; password: string }, ip?: string) {
  await ensureAccessCatalog();
  const existing = await db().user.findUnique({ where: { email: input.email } });
  if (existing && !existing.deletedAt) throw new Error("E-mail ja cadastrado.");

  const role = await db().role.findUnique({ where: { name: input.role } });
  if (!role) throw new Error("Perfil invalido.");

  const permissionKeys = rolePermissionDefaults[input.role] ?? [];
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = existing
    ? await db().user.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          passwordHash,
          roleId: role.id,
          active: true,
          isPrimaryAdmin: false,
          mustChangePassword: true,
          deletedAt: null
        }
      })
    : await db().user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          roleId: role.id,
          active: true,
          isPrimaryAdmin: false,
          mustChangePassword: true
        }
      });

  await replaceUserPermissions(user.id, permissionKeys);
  const created = await findUserById(user.id);
  if (!created) throw new Error("Usuario nao encontrado.");

  await addAdminLog(actor, created, "CRIOU_USUARIO", ip);
  return created;
}

export async function updateUserRole(actor: AccessUser, targetId: string, roleName: AccessRole, ip?: string) {
  const target = await findUserById(targetId);
  if (!target) throw new Error("Usuario nao encontrado.");
  if (target.isPrimaryAdmin && actor.id !== target.id) {
    throw new Error("O ADMIN principal nao pode ter o perfil alterado por outro usuario.");
  }
  if (target.role === "ADMIN" && roleName !== "ADMIN") {
    const activeAdmins = await activeAdminCountExcept(target.id);
    if (!activeAdmins) throw new Error("Deve existir pelo menos um ADMIN ativo.");
  }

  const role = await db().role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error("Perfil invalido.");

  await db().user.update({ where: { id: target.id }, data: { roleId: role.id } });
  await replaceUserPermissions(target.id, rolePermissionDefaults[roleName] ?? target.permissions);

  const updated = await findUserById(target.id);
  if (!updated) throw new Error("Usuario nao encontrado.");

  await addAdminLog(actor, updated, "ALTEROU_PERFIL", ip);
  return updated;
}

export async function deleteAccessUser(actor: AccessUser, targetId: string, ip?: string) {
  const target = await findUserById(targetId);
  if (!target) throw new Error("Usuario nao encontrado.");
  if (!actor.isPrimaryAdmin) throw new Error("Apenas o ADMIN principal pode excluir usuarios.");
  if (target.isPrimaryAdmin) throw new Error("O ADMIN principal nao pode ser excluido.");
  if (target.role === "ADMIN") {
    const activeAdmins = await activeAdminCountExcept(target.id);
    if (!activeAdmins) throw new Error("Deve existir pelo menos um ADMIN ativo.");
  }

  await db().user.update({
    where: { id: target.id },
    data: {
      active: false,
      deletedAt: new Date()
    }
  });
  await addAdminLog(actor, target, "EXCLUIU_USUARIO", ip);
}

export async function resetUserPassword(actor: AccessUser, targetId: string, newPassword: string, ip?: string) {
  const target = await findUserById(targetId);
  if (!target) throw new Error("Usuario nao encontrado.");
  if (target.isPrimaryAdmin && actor.id !== target.id) {
    throw new Error("A senha do ADMIN principal nao pode ser redefinida por outro usuario.");
  }

  await db().user.update({
    where: { id: target.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      mustChangePassword: true
    }
  });

  const updated = await findUserById(target.id);
  if (!updated) throw new Error("Usuario nao encontrado.");

  await addAdminLog(actor, updated, "REDEFINIU_SENHA", ip);
  return updated;
}

export async function changePassword(user: AccessUser, currentPassword: string, newPassword: string) {
  const freshUser = await findUserById(user.id);
  if (!freshUser) throw new Error("Usuario nao encontrado.");

  const valid = await bcrypt.compare(currentPassword, freshUser.passwordHash);
  if (!valid) throw new Error("Senha atual invalida.");

  await db().user.update({
    where: { id: freshUser.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      mustChangePassword: false
    }
  });

  const updated = await findUserById(freshUser.id);
  if (!updated) throw new Error("Usuario nao encontrado.");

  await addAdminLog(updated, updated, "ALTEROU_PROPRIA_SENHA");
  return updated;
}
