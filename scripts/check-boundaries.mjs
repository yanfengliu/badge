import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const sourceExtensions = new Set([".js", ".mjs", ".ts", ".tsx"]);
const failures = [];

function filesUnder(relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const found = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (sourceExtensions.has(path.extname(entry.name))) found.push(path.resolve(absolute));
    }
  };
  visit(absoluteRoot);
  return found;
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function isInside(file, relativeScope) {
  const result = path.relative(path.join(root, relativeScope), file);
  return result === "" || (!result.startsWith(`..${path.sep}`) && result !== "..");
}

function loadWorkspacePackages() {
  const packages = new Map();
  for (const workspaceRoot of ["apps", "packages"]) {
    const absoluteRoot = path.join(root, workspaceRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = path.join(absoluteRoot, entry.name);
      const packagePath = path.join(directory, "package.json");
      if (!fs.existsSync(packagePath)) continue;
      const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      if (typeof manifest.name === "string") {
        packages.set(manifest.name, { directory, exports: manifest.exports ?? {} });
      }
    }
  }
  return packages;
}

const workspacePackages = loadWorkspacePackages();
const allSourceFiles = [...filesUnder("apps"), ...filesUnder("packages"), ...filesUnder("scripts")];
const sourceFileSet = new Set(allSourceFiles);

function resolveSourceFile(candidate) {
  const attempts = [candidate];
  const extension = path.extname(candidate);
  if (extension === ".js" || extension === ".mjs") {
    attempts.push(candidate.slice(0, -extension.length) + ".ts");
    attempts.push(candidate.slice(0, -extension.length) + ".tsx");
  } else if (!extension) {
    for (const suffix of [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"]) {
      attempts.push(candidate + suffix);
    }
  }
  return attempts.map((attempt) => path.resolve(attempt)).find((attempt) => sourceFileSet.has(attempt));
}

function exportedTarget(packageInfo, subpath) {
  if (typeof packageInfo.exports === "string" && subpath === "") return packageInfo.exports;
  if (packageInfo.exports && typeof packageInfo.exports === "object") {
    const key = subpath === "" ? "." : `.${subpath}`;
    const target = packageInfo.exports[key];
    if (typeof target === "string") return target;
  }
  return undefined;
}

function resolveModule(file, specifier) {
  if (specifier.startsWith(".")) {
    const candidate = path.resolve(path.dirname(file), specifier);
    const source = resolveSourceFile(candidate);
    if (source) return source;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return false;
    return undefined;
  }
  for (const [name, packageInfo] of workspacePackages) {
    if (specifier !== name && !specifier.startsWith(`${name}/`)) continue;
    const target = exportedTarget(packageInfo, specifier.slice(name.length));
    return target ? resolveSourceFile(path.resolve(packageInfo.directory, target)) : undefined;
  }
  return null;
}

function moduleSpecifiers(file) {
  const sourceText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const found = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) found.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      found.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const graph = new Map();
const externalImports = new Map();
for (const file of allSourceFiles) {
  const local = [];
  const external = [];
  for (const specifier of moduleSpecifiers(file)) {
    const resolved = resolveModule(file, specifier);
    if (resolved) local.push(resolved);
    else if (resolved === null) external.push(specifier);
    else if (resolved === false) continue;
    else failures.push(`${relative(file)} imports unresolved local module ${JSON.stringify(specifier)}.`);
  }
  graph.set(file, local);
  externalImports.set(file, external);
}

function assertNoReachable(scope, forbiddenScopes) {
  const queue = filesUnder(scope).map((file) => ({ file, path: [file] }));
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current.file)) continue;
    visited.add(current.file);
    for (const forbidden of forbiddenScopes) {
      if (isInside(current.file, forbidden)) {
        failures.push(
          `${scope} reaches forbidden scope ${forbidden} through ${current.path.map(relative).join(" -> ")}.`,
        );
        break;
      }
    }
    for (const dependency of graph.get(current.file) ?? []) {
      queue.push({ file: dependency, path: [...current.path, dependency] });
    }
  }
}

function assertNoExternal(scope, forbiddenRoots) {
  for (const file of filesUnder(scope)) {
    for (const specifier of externalImports.get(file) ?? []) {
      if (forbiddenRoots.some((rootName) => specifier === rootName || specifier.startsWith(`${rootName}/`))) {
        failures.push(`${relative(file)} imports forbidden external module ${specifier}.`);
      }
    }
  }
}

assertNoReachable("apps/archive-web/src", [
  "apps/studio-web/src",
  "packages/art-generation-contract/src",
  "packages/authoring-request-contract/src",
  "packages/pack-compiler/src",
]);
assertNoReachable("apps/studio-web/src", [
  "apps/archive-web/src",
  "packages/archive-application/src",
  "packages/archive-domain/src",
  "packages/saying-contract/src",
]);
assertNoReachable("packages/archive-domain/src", [
  "apps",
  "packages/archive-application/src",
  "packages/renderer-web/src",
]);
assertNoReachable("packages/archive-application/src", ["apps", "packages/renderer-web/src"]);
assertNoReachable("packages/pack-contract/src", ["apps", "packages/renderer-web/src"]);
assertNoReachable("packages/pack-compiler/src", ["apps", "packages/renderer-web/src"]);
assertNoReachable("packages/saying-contract/src", [
  "apps",
  "packages/archive-application/src",
  "packages/archive-domain/src",
  "packages/art-generation-contract/src",
  "packages/renderer-web/src",
]);

assertNoExternal("packages/archive-domain/src", ["react", "idb", "three", "@react-three"]);
assertNoExternal("packages/archive-application/src", ["react", "three", "@react-three"]);
assertNoExternal("packages/pack-contract/src", ["react", "idb", "three", "@react-three"]);
assertNoExternal("packages/pack-compiler/src", ["react", "idb", "three", "@react-three"]);
assertNoExternal("packages/saying-contract/src", ["react", "idb", "three", "@react-three"]);

for (const scope of ["apps", "packages", "scripts"]) {
  for (const file of filesUnder(scope)) {
    const lineCount = fs.readFileSync(file, "utf8").split(/\r?\n/u).length;
    if (lineCount > 1_000) failures.push(`${relative(file)} has ${lineCount} lines; the hard limit is 1000.`);
  }
}

const archiveSources = filesUnder("apps/archive-web/src")
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
for (const forbiddenSurface of ["Generate candidates", "source-art proposals", "Process selected again"]) {
  if (archiveSources.includes(forbiddenSurface)) {
    failures.push(`Archive exposes Studio-only surface ${JSON.stringify(forbiddenSurface)}.`);
  }
}

if (failures.length > 0) {
  const uniqueFailures = [...new Set(failures)];
  console.error(
    `Boundary check failed with ${uniqueFailures.length} issue${uniqueFailures.length === 1 ? "" : "s"}:`,
  );
  for (const failure of uniqueFailures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    "Boundary check passed: parsed import graphs preserve Archive, Studio, domain, and compiler separation.",
  );
}
