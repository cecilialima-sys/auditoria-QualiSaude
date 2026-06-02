import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sectors } from "../src/lib/constants/audit-data";
import { checklistTemplateGroups } from "../src/lib/checklists/checklist-template";
import { permissionCatalog, rolePermissionDefaults } from "../src/lib/permissions/permissions";

const prisma = new PrismaClient();

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de executar o seed.");
  }
  return { email, password };
}

async function main() {
  const adminCredentials = getAdminCredentials();

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
