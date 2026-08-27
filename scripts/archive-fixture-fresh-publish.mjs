import { lstat, rename } from "node:fs/promises";

export const TRANSIENT_WINDOWS_RENAME_ATTEMPTS = 8;

export function isTransientWindowsRenameError(error) {
  return hasCode(error, "EPERM") || hasCode(error, "EACCES") || hasCode(error, "EBUSY");
}

export async function publishFreshFixtureDirectory({ target, stagingDirectory, validateExactTree }) {
  let published = false;
  let lastTransientError;
  for (let attempt = 1; attempt <= TRANSIENT_WINDOWS_RENAME_ATTEMPTS; attempt += 1) {
    const wasPublished = published;
    try {
      if (!published) {
        await target.testHooks.beforePublishRenameAttempt?.({ ...target, attempt, stagingDirectory });
        await rename(stagingDirectory, target.outputDirectory);
        published = true;
      }
      await target.testHooks.beforePublishValidationAttempt?.({ ...target, attempt });
      await validateExactTree(lastTransientError);
      return;
    } catch (error) {
      if (!isTransientWindowsRenameError(error)) throw error;
      lastTransientError = error;
      const stagingStatus = await lstatOrUndefined(stagingDirectory);
      const outputStatus = await lstatOrUndefined(target.outputDirectory);
      if (stagingStatus && !outputStatus) {
        assertRealDirectory(stagingStatus, stagingDirectory, "staging");
        published = false;
      } else if (!stagingStatus && outputStatus) {
        assertRealDirectory(outputStatus, target.outputDirectory, "output");
        published = true;
      } else {
        throw transientPublishError(target, stagingDirectory, attempt, error);
      }
      if (attempt === TRANSIENT_WINDOWS_RENAME_ATTEMPTS) {
        if (!wasPublished && published) return validateExactTree(error);
        throw transientPublishError(target, stagingDirectory, attempt, error);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(10 * 2 ** (attempt - 1), 100)));
    }
  }
}

function transientPublishError(target, stagingDirectory, attempt, cause) {
  return new Error(
    `Archive fixture generator could not publish ${stagingDirectory} to ${target.outputDirectory} after ${attempt} transient Windows filesystem denials; close the scanner or process holding this task-owned path and retry.`,
    { cause },
  );
}

async function lstatOrUndefined(candidate) {
  try {
    return await lstat(candidate);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

function assertRealDirectory(status, candidate, subject) {
  if (status.isSymbolicLink() || !status.isDirectory()) {
    throw new Error(`Archive fixture ${subject} ${candidate} must be a real directory, not a link or file.`);
  }
}

function hasCode(error, code) {
  return error && typeof error === "object" && error.code === code;
}
