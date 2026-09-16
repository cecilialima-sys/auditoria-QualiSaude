import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// O cache padrão do Puppeteer pode ficar fora do artefato final do Render.
// Mantê-lo dentro do projeto faz com que o mesmo Chrome exista no build e
// durante a execução do serviço.
const cacheDirectory = resolve(process.cwd(), ".cache", "puppeteer");
const command = process.platform === "win32"
  ? join(process.cwd(), "node_modules", ".bin", "puppeteer.cmd")
  : join(process.cwd(), "node_modules", ".bin", "puppeteer");

if (!existsSync(command)) {
  console.warn("[puppeteer-install] CLI do Puppeteer não encontrada; a instalação será ignorada.");
  process.exit(0);
}

mkdirSync(cacheDirectory, { recursive: true });
const result = spawnSync(command, ["browsers", "install", "chrome"], {
  env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDirectory },
  stdio: "inherit"
});

if (result.status !== 0) process.exit(result.status ?? 1);
