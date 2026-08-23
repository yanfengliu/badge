import { readFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist/local");
const archivePath = path.join(outputDirectory, "index.html");
const studioPath = path.join(outputDirectory, "studio", "index.html");
const [archiveHtml, studioHtml] = await Promise.all([
  readFile(archivePath, "utf8"),
  readFile(studioPath, "utf8"),
]);

const markers = {
  archive: '<meta name="badge-application" content="archive" />',
  studio: '<meta name="badge-application" content="studio" />',
};

if (!archiveHtml.includes(markers.archive) || archiveHtml.includes(markers.studio)) {
  throw new Error(
    "The built root document must identify only Badge Archive; rebuild the one-site host from its separate Archive entry.",
  );
}
if (!studioHtml.includes(markers.studio) || studioHtml.includes(markers.archive)) {
  throw new Error(
    "The built /studio/ document must identify only Badge Studio; rebuild the one-site host from its separate Studio entry.",
  );
}

function entryScript(html, label) {
  const match = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/u);
  if (!match) throw new Error(`The built ${label} document has no module entry script.`);
  return match[1];
}

const archiveEntry = entryScript(archiveHtml, "Archive");
const studioEntry = entryScript(studioHtml, "Studio");
if (archiveEntry === studioEntry) {
  throw new Error(
    `Archive and Studio both load ${archiveEntry}; keep their application entry chunks distinct on the shared origin.`,
  );
}

console.log(
  `Single-site build passed: / loads ${archiveEntry} and /studio/ loads the distinct ${studioEntry}.`,
);
