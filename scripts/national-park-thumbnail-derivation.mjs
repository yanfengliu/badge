import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const defaultRepositoryRoot = path.resolve(import.meta.dirname, "..");

export async function regenerateNationalParkThumbnails({
  repositoryRoot = defaultRepositoryRoot,
  sourceDirectory,
  outputDirectory,
  expectedCount,
} = {}) {
  const thumbnailScript = path.resolve(repositoryRoot, "scripts/write-national-park-thumbnails.ps1");
  const arguments_ = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", thumbnailScript];
  if (sourceDirectory !== undefined) {
    arguments_.push("-SourceDirectory", sourceDirectory);
  }
  if (outputDirectory !== undefined) {
    arguments_.push("-OutputDirectory", outputDirectory);
  }
  if (expectedCount !== undefined) {
    arguments_.push("-ExpectedCount", String(expectedCount));
  }

  try {
    await execFileAsync("powershell", arguments_, {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
  } catch (error) {
    const detail =
      typeof error === "object" && error !== null && "stderr" in error
        ? String(error.stderr).trim()
        : String(error);
    throw new Error(
      `National-park thumbnail derivation could not regenerate deterministic list art from the current source studies; ${detail || "run npm run catalogue:thumbnails and resolve the reported derivation error."}`,
      { cause: error },
    );
  }
}
