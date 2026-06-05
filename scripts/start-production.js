const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || "3000";
const nextBin = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");

const child = spawn(nextBin, ["start", "-p", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || "production"
  }
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
