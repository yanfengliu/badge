import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const safeRoot = root.split(path.sep).join("/");
const forbiddenExportExtensions = new Set([
  ".badgearchive",
  ".badgebrief",
  ".badgepack",
  ".badgestudio",
  ".badgetheme",
]);
const credentialPatterns = [
  ["private key", /-----BEGIN (?:DSA |EC |OPENSSH |RSA )?PRIVATE KEY-----/],
  ["OpenAI-style key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
  ["bearer credential", /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}\b/i],
];

function gitBytes(...args) {
  return execFileSync("git", ["-c", `safe.directory=${safeRoot}`, ...args], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const stagedFiles = gitBytes("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const failures = [];

for (const file of stagedFiles) {
  const normalized = file.split("\\").join("/");
  const basename = path.posix.basename(normalized);
  const extension = path.posix.extname(normalized).toLowerCase();
  let forbiddenByName = false;

  if (forbiddenExportExtensions.has(extension)) {
    failures.push(`${normalized}: local Badge handoff or backup files must not be committed`);
    forbiddenByName = true;
  }

  if ((basename === ".env" || basename.startsWith(".env.")) && basename !== ".env.example") {
    failures.push(`${normalized}: environment secret files must not be committed`);
    forbiddenByName = true;
  }

  if (forbiddenByName) {
    continue;
  }

  const stagedBlob = gitBytes("show", `:0:${file}`).toString("utf8");

  for (const [label, pattern] of credentialPatterns) {
    if (pattern.test(stagedBlob)) {
      failures.push(`${normalized}: staged blob contains a likely ${label}`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`error: ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log(`Staged secret check passed: ${stagedFiles.length} changed files inspected.`);
}
