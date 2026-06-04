const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { getDatabaseUrl, loadEnv, safeDatabaseUrl } = require("./env-utils");

loadEnv();

function findPostgresBinary(binaryName) {
  const candidates = [];
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const postgresRoot = path.join(programFiles, "PostgreSQL");

  if (fs.existsSync(postgresRoot)) {
    for (const version of fs.readdirSync(postgresRoot).sort().reverse()) {
      candidates.push(path.join(postgresRoot, version, "bin", `${binaryName}.exe`));
    }
  }

  candidates.push(binaryName);
  return candidates.find((candidate) => {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  });
}

async function canConnect() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const dbName = databaseUrl.pathname.replace(/^\//, "");
  if (!dbName) throw new Error("DATABASE_URL deve informar o nome do banco.");

  if (await canConnect()) {
    console.log(`[db:setup] Banco já acessível: ${safeDatabaseUrl()}`);
    return;
  }

  const createdb = findPostgresBinary("createdb");
  if (!createdb) {
    console.error("[db:setup] Não encontrei o comando createdb do PostgreSQL.");
    console.error("[db:setup] Crie o banco manualmente ou adicione a pasta bin do PostgreSQL ao PATH.");
    process.exit(1);
  }

  const args = ["-h", databaseUrl.hostname || "localhost", "-p", databaseUrl.port || "5432", "-U", decodeURIComponent(databaseUrl.username), dbName];
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(databaseUrl.password || "") };

  try {
    execFileSync(createdb, args, { env, stdio: "pipe" });
    console.log(`[db:setup] Banco criado: ${dbName}`);
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`;
    if (output.toLowerCase().includes("already exists") || output.toLowerCase().includes("já existe")) {
      console.log(`[db:setup] Banco já existe: ${dbName}`);
      return;
    }
    console.error("[db:setup] Não foi possível criar o banco. Verifique permissões do usuário configurado no DATABASE_URL.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[db:setup] ${error.message}`);
  process.exit(1);
});
