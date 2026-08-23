import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".playwright-cli",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "tmp",
]);
const binaryExtensions = new Set([
  ".avif",
  ".badgearchive",
  ".badgeevidence.json",
  ".badgepack",
  ".badgestudio",
  ".badgetheme",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
  ".zip",
]);
const failures = [];
const warnings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function normalizeNewlines(text) {
  return text.replaceAll("\r\n", "\n");
}

function isExternalLink(target) {
  return /^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target);
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

const files = await walk(root);
const markdownFiles = files.filter((filePath) => path.extname(filePath).toLowerCase() === ".md");
let checkedLinks = 0;

for (const filePath of markdownFiles) {
  const text = normalizeNewlines(await readFile(filePath, "utf8"));
  const lines = text.split("\n");

  if (!text.endsWith("\n")) {
    failures.push(`${relative(filePath)}: file must end with a newline`);
  }

  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      failures.push(`${relative(filePath)}:${index + 1}: trailing whitespace`);
    }
  });

  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of text.matchAll(linkPattern)) {
    let target = match[1].trim();

    if (isExternalLink(target)) {
      continue;
    }

    target = target.replace(/^<|>$/g, "").split("#", 1)[0];

    if (!target) {
      continue;
    }

    checkedLinks += 1;
    const resolved = path.resolve(path.dirname(filePath), decodeURIComponent(target));

    if (!(await pathExists(resolved))) {
      failures.push(`${relative(filePath)}: missing link target ${target}`);
    }
  }
}

for (const filePath of files) {
  const fileStat = await stat(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const binaryLike =
    binaryExtensions.has(extension) || relative(filePath).toLowerCase().endsWith(".badgeevidence.json");

  if (binaryLike && fileStat.size > 512 * 1024) {
    failures.push(`${relative(filePath)}: binary is ${fileStat.size} bytes, above the 512 KiB fleet ceiling`);
  } else if (binaryLike && fileStat.size > 256 * 1024) {
    warnings.push(
      `${relative(filePath)}: binary is ${fileStat.size} bytes and needs a stated repository-input reason`,
    );
  } else if (fileStat.size > 1024 * 1024) {
    failures.push(`${relative(filePath)}: file is ${fileStat.size} bytes, above the 1 MiB fleet ceiling`);
  }
}

const claudeText = normalizeNewlines(await readFile(path.join(root, "CLAUDE.md"), "utf8"));

if (claudeText !== "@AGENTS.md\n") {
  failures.push("CLAUDE.md: must contain exactly @AGENTS.md followed by one newline");
}

const agentsText = normalizeNewlines(await readFile(path.join(root, "AGENTS.md"), "utf8"));
const agentsLines = agentsText.trimEnd().split("\n").length;

if (agentsLines > 150) {
  failures.push(`AGENTS.md: ${agentsLines} lines exceeds the fleet target of 150`);
}

const fleetPath = path.resolve(root, "../fleet/FLEET.md");

if (await pathExists(fleetPath)) {
  const fleetText = normalizeNewlines(await readFile(fleetPath, "utf8"));
  const fleetMatch = fleetText.match(/^## Fleet constitution\n[\s\S]*?(?=\n## Repo file shape)/m);
  const agentsMatch = agentsText.match(
    /<!-- FLEET-CANON:BEGIN[^\n]*-->\n([\s\S]*?)\n<!-- FLEET-CANON:END -->/,
  );

  if (!fleetMatch || !agentsMatch) {
    failures.push("AGENTS.md: could not locate comparable fleet constitution blocks");
  } else if (fleetMatch[0].trim() !== agentsMatch[1].trim()) {
    failures.push("AGENTS.md: seeded fleet constitution differs from ../fleet/FLEET.md");
  }
} else {
  warnings.push("../fleet/FLEET.md is unavailable; skipped seeded constitution comparison");
}

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`error: ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `Documentation checks passed: ${markdownFiles.length} Markdown files, ${checkedLinks} local links, AGENTS.md ${agentsLines} lines.`,
  );
}
