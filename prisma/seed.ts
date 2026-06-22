import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { sectors } from "../src/lib/constants/audit-data";
import { checklistTemplateGroups } from "../src/lib/checklists/checklist-template";
import { allPermissionKeys, permissionCatalog, rolePermissionDefaults } from "../src/lib/permissions/permissions";

function loadEnv(root = process.cwd()) {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const prisma = new PrismaClient();
const legacyDeveloperEmail = "desenvolvedor.qualisaude@example.local";

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de executar o seed.");
  }
  return { email, password };
}

function getDeveloperUserConfig() {
  const enabled = process.env.SEED_DEVELOPER_USER?.toLowerCase() !== "false";
  if (!enabled) return null;

  const email = process.env.DEV_USER_EMAIL || (process.env.NODE_ENV === "production" ? undefined : process.env.ADMIN_EMAIL);
  if (!email) return null;

  const configuredPassword = process.env.DEV_USER_PASSWORD;
  if (process.env.NODE_ENV === "production" && !configuredPassword) {
    throw new Error("Defina DEV_USER_PASSWORD para criar o usuario de desenvolvedor em producao.");
  }

  return {
    email,
    name: process.env.DEV_USER_NAME || "Desenvolvedor QualiSaude",
    password: configuredPassword || randomBytes(18).toString("base64url"),
    generatedPassword: !configuredPassword
  };
}

async function main() {
  const adminCredentials = getAdminCredentials();
  const developerUserConfig = getDeveloperUserConfig();

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const permissions = await Promise.all(
    permissionCatalog.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: { label: permission.label },
        create: {
          key: permission.key,
          label: permission.label,
          description: permission.module
        }
      })
    )
  );

  for (const role of roles) {
    const defaults = rolePermissionDefaults[role.name as keyof typeof rolePermissionDefaults] ?? [];
    for (const permissionKey of defaults) {
      const permission = permissions.find((item) => item.key === permissionKey);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  const adminRole = roles.find((role) => role.name === "ADMIN")!;

  const admin = await prisma.user.upsert({
    where: { email: adminCredentials.email },
    update: {},
    create: {
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
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: admin.id, permissionId: permission.id } },
      update: { allowed: true },
      create: { userId: admin.id, permissionId: permission.id, allowed: true }
    });
  }

  if (developerUserConfig) {
    const existingDeveloperUser = await prisma.user.findUnique({
      where: { email: developerUserConfig.email }
    });

    const developerUser = existingDeveloperUser
      ? await prisma.user.update({
          where: { id: existingDeveloperUser.id },
          data: {
            name: process.env.DEV_USER_NAME ? developerUserConfig.name : existingDeveloperUser.name,
            roleId: adminRole.id,
            active: true,
            deletedAt: null,
            ...(process.env.DEV_USER_PASSWORD
              ? {
                  passwordHash: await bcrypt.hash(developerUserConfig.password, 12),
                  mustChangePassword: true
                }
              : {})
          }
        })
      : await prisma.user.create({
          data: {
            name: developerUserConfig.name,
            email: developerUserConfig.email,
            passwordHash: await bcrypt.hash(developerUserConfig.password, 12),
            roleId: adminRole.id,
            active: true,
            isPrimaryAdmin: false,
            mustChangePassword: true
          }
        });

    for (const permissionKey of allPermissionKeys) {
      const permission = permissions.find((item) => item.key === permissionKey);
      if (!permission) continue;
      await prisma.userPermission.upsert({
        where: { userId_permissionId: { userId: developerUser.id, permissionId: permission.id } },
        update: { allowed: true },
        create: { userId: developerUser.id, permissionId: permission.id, allowed: true }
      });
    }

    if (!existingDeveloperUser && developerUserConfig.generatedPassword) {
      console.info(`Usuario de desenvolvedor criado: ${developerUserConfig.email}`);
      console.info(`Senha inicial gerada: ${developerUserConfig.password}`);
      console.info("Altere essa senha no primeiro login.");
    } else {
      console.info(`Usuario de desenvolvedor garantido: ${developerUserConfig.email}`);
    }

    if (developerUserConfig.email !== legacyDeveloperEmail) {
      const legacyDeveloperUser = await prisma.user.findUnique({ where: { email: legacyDeveloperEmail } });
      if (legacyDeveloperUser && !legacyDeveloperUser.isPrimaryAdmin && legacyDeveloperUser.deletedAt === null) {
        await prisma.user.update({
          where: { id: legacyDeveloperUser.id },
          data: {
            active: false,
            deletedAt: new Date()
          }
        });
        console.info(`Usuario de desenvolvedor legado desativado: ${legacyDeveloperEmail}`);
      }
    }
  }

  await Promise.all(
    sectors.map((name) =>
      prisma.sector.upsert({
        where: { name },
        update: {},
        create: { name, active: true }
      })
    )
  );

  const existingChecklist = await prisma.checklist.findFirst();
  if (!existingChecklist && checklistTemplateGroups.length) {
    for (const group of checklistTemplateGroups) {
      const checklist = await prisma.checklist.create({
        data: { name: `Checklist - ${group.category}`, category: group.category }
      });

      await prisma.checklistItem.createMany({
        data: group.questions.map((question) => ({
          checklistId: checklist.id,
          category: group.category,
          item: question.text,
          criterion: question.criterion
        }))
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
