import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { APP_MARKERS } from "./local-launcher.mjs";

const outputDirectory = path.resolve("dist/local");
const htmlPath = path.join(outputDirectory, "index.html");
const studioDocumentPath = path.join(outputDirectory, "studio", "index.html");
const manifestPath = path.join(outputDirectory, ".vite", "manifest.json");
const [html, manifestSource] = await Promise.all([
  readFile(htmlPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);

if (
  !html.includes(APP_MARKERS.badge) ||
  !html.includes('<div id="root"></div>') ||
  html.includes('content="archive"') ||
  html.includes('content="studio"')
) {
  throw new Error("The built root document must identify the complete single-root Badge application.");
}

try {
  await access(studioDocumentPath);
  throw new Error(
    "The built site still contains studio/index.html; Badge Studio must be a root-page section.",
  );
} catch (error) {
  if (!(error && typeof error === "object" && error.code === "ENOENT")) throw error;
}

const manifest = JSON.parse(manifestSource);
const entry = manifest["index.html"];
if (!entry?.isEntry || typeof entry.file !== "string") {
  throw new Error("The built root document has no manifest-bound host entry chunk.");
}
const entrySource = await readFile(path.join(outputDirectory, entry.file), "utf8");
for (const surface of ["Badge Archive", "Badge Studio"]) {
  if (!entrySource.includes(surface)) {
    throw new Error(`The single root host entry does not compose the ${surface} surface.`);
  }
}

console.log(`Single-root site build passed: / loads ${entry.file} with Archive and Studio sections.`);
