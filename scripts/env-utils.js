const fs = require("fs");
const path = require("path");

function loadEnv(root = process.cwd()) {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return { loaded: false, path: envPath };

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
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

  return { loaded: true, path: envPath };
}

function safeDatabaseUrl(rawUrl = process.env.DATABASE_URL) {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    if (url.password) url.password = "***";
    if (url.username) url.username = url.username ? `${url.username}` : "";
    return url.toString();
  } catch {
    return "DATABASE_URL inválida";
  }
}

function getDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error("DATABASE_URL não está definida. Configure o arquivo .env antes de iniciar o sistema.");
  }
  return new URL(rawUrl);
}

module.exports = {
  loadEnv,
  safeDatabaseUrl,
  getDatabaseUrl
};
