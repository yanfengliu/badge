import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const viteCli = path.resolve("node_modules/vite/bin/vite.js");
const targets = [
  { config: "apps/archive-web/vite.config.ts", port: "4173" },
  { config: "apps/studio-web/vite.config.ts", port: "4174" },
];
const children = targets.map(({ config, port }) =>
  spawn(
    process.execPath,
    [viteCli, "--config", config, "--host", "127.0.0.1", "--port", port, "--strictPort"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      windowsHide: true,
    },
  ),
);

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }

  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code !== 0) stop(code ?? 1);
  });
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
