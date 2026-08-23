import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";

const trustedTargets = new WeakMap();
const verificationIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/u;

function trust(paths) {
  const target = Object.freeze({});
  trustedTargets.set(target, Object.freeze(paths));
  return target;
}

export function createCanonicalRuntimeTarget(repositoryRoot = process.cwd()) {
  const root = path.resolve(repositoryRoot);
  return trust({
    kind: "canonical",
    repositoryRoot: root,
    configPath: path.join(root, ".badge-local", "site.json"),
    cleanupDirectory: null,
  });
}

export function createVerificationRuntimeTarget(repositoryRoot = process.cwd(), identifier = randomUUID()) {
  if (!verificationIdPattern.test(identifier) || identifier === "." || identifier === "..") {
    throw new Error(
      "The local-startup verification target identifier must be one path-free name of at most 64 letters, digits, dots, underscores, or hyphens.",
    );
  }
  const root = path.resolve(repositoryRoot);
  const base = path.join(root, "tmp", "local-startup");
  const directory = path.resolve(base, identifier);
  if (path.dirname(directory) !== base) {
    throw new Error("The local-startup verification target must stay directly under tmp/local-startup.");
  }
  return trust({
    kind: "verification",
    repositoryRoot: root,
    configPath: path.join(directory, "site.json"),
    cleanupDirectory: directory,
  });
}

export function runtimeTargetPaths(target) {
  const paths = trustedTargets.get(target);
  if (!paths) {
    throw new Error(
      "Badge local startup requires a trusted local runtime target created by its canonical or verification factory.",
    );
  }
  return { ...paths };
}
