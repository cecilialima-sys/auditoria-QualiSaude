const { PrismaClient } = require("@prisma/client");
const { loadEnv, safeDatabaseUrl } = require("./env-utils");

loadEnv();

function explainPrismaError(error) {
  if (error?.code === "P1000") return "Usuário ou senha do PostgreSQL incorretos.";
  if (error?.code === "P1001") return "PostgreSQL inacessível. Verifique serviço, host e porta.";
  if (error?.code === "P1003") return "Banco de dados inexistente. Execute npm run db:setup ou crie o banco manualmente.";
  if (error?.code === "P1012") return "DATABASE_URL inválida ou schema Prisma inconsistente.";
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("authentication failed") || message.includes("password authentication")) {
    return "Usuário ou senha do PostgreSQL incorretos.";
  }
  if (message.includes("does not exist") && message.includes("database")) {
    return "Banco de dados inexistente. Execute npm run db:setup ou crie o banco manualmente.";
  }
  if (message.includes("can't reach database server") || message.includes("connect")) {
    return "PostgreSQL inacessível. Verifique se o serviço está rodando e se host/porta estão corretos.";
  }
  if (String(error?.message || "").includes("@prisma/client did not initialize")) {
    return "Prisma Client ainda não foi gerado. Execute npm run prisma:generate.";
  }
  return "Erro ao conectar ao PostgreSQL. Verifique serviço, banco, usuário, senha e DATABASE_URL.";
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[db:check] DATABASE_URL ausente. Copie .env.example para .env e configure a conexão.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[db:check] PostgreSQL conectado com sucesso: ${safeDatabaseUrl()}`);
  } catch (error) {
    console.error(`[db:check] ${explainPrismaError(error)}`);
    console.error(`[db:check] Conexão usada: ${safeDatabaseUrl()}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main();
