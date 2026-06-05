import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  qualisaudePrisma?: PrismaClient;
};

export function getPrismaClient() {
  if (!globalForPrisma.qualisaudePrisma) {
    globalForPrisma.qualisaudePrisma = new PrismaClient();
  }

  return globalForPrisma.qualisaudePrisma;
}
