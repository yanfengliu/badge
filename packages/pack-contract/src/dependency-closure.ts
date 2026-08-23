import type { AdmittedPack } from "./admission.ts";
import type { PackRef, PublishedBadgeVisual, ThemePackManifest } from "./schema.ts";

export class PackDependencyClosureError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PackDependencyClosureError";
  }
}

export function validatePackDependencyClosure(
  root: AdmittedPack,
  dependencies: readonly AdmittedPack[],
): void {
  const rootKey = exactRefKey(root.packRef);
  const available = new Map<string, AdmittedPack>([[rootKey, root]]);
  const suppliedKeys = new Set<string>();
  const releases = new Map<string, string>([[releaseKey(root.packRef), root.packRef.packDigest]]);
  for (const reference of root.manifest.dependencies) {
    const release = releaseKey(reference);
    const knownDigest = releases.get(release);
    if (knownDigest !== undefined && knownDigest !== reference.packDigest) {
      throw new PackDependencyClosureError(
        `Pack ${displayRef(root.packRef)} declares a same-version dependency fork for ${release}; publish one reviewed exact release.`,
      );
    }
    releases.set(release, reference.packDigest);
  }

  for (const dependency of dependencies) {
    const key = exactRefKey(dependency.packRef);
    if (key === rootKey) {
      throw new PackDependencyClosureError(
        `Dependency closure for ${displayRef(root.packRef)} repeats the root pack as a dependency; remove the duplicate file.`,
      );
    }
    if (available.has(key)) {
      throw new PackDependencyClosureError(
        `Dependency closure for ${displayRef(root.packRef)} supplies exact dependency ${displayRef(dependency.packRef)} more than once; keep one copy.`,
      );
    }
    const release = releaseKey(dependency.packRef);
    const knownDigest = releases.get(release);
    if (knownDigest !== undefined && knownDigest !== dependency.packRef.packDigest) {
      throw new PackDependencyClosureError(
        `Dependency closure contains a same-version fork for ${release}: digests ${knownDigest} and ${dependency.packRef.packDigest}; provide one reviewed exact release.`,
      );
    }
    releases.set(release, dependency.packRef.packDigest);
    suppliedKeys.add(key);
    available.set(key, dependency);
  }

  const complete = new Set<string>();
  const visiting: string[] = [];
  const reachable = new Set<string>();

  const visit = (pack: AdmittedPack): void => {
    const key = exactRefKey(pack.packRef);
    if (complete.has(key)) return;
    const cycleStart = visiting.indexOf(key);
    if (cycleStart >= 0) {
      const cycle = [...visiting.slice(cycleStart), key]
        .map((cycleKey) => displayRef(available.get(cycleKey)?.packRef ?? pack.packRef))
        .join(" -> ");
      throw new PackDependencyClosureError(
        `Dependency closure for ${displayRef(root.packRef)} contains a cycle: ${cycle}; publish an acyclic exact closure.`,
      );
    }

    visiting.push(key);
    reachable.add(key);
    for (const reference of pack.manifest.dependencies) {
      const dependency = available.get(exactRefKey(reference));
      if (dependency === undefined) {
        throw new PackDependencyClosureError(
          `Pack ${displayRef(pack.packRef)} requires exact dependency ${displayRef(reference)}, but those admitted bytes were not supplied.`,
        );
      }
      visit(dependency);
    }
    validateVisualFallbacks(pack, available);
    visiting.pop();
    complete.add(key);
  };

  visit(root);

  for (const key of suppliedKeys) {
    if (!reachable.has(key)) {
      const extra = available.get(key);
      throw new PackDependencyClosureError(
        `Dependency closure for ${displayRef(root.packRef)} includes unreferenced pack ${displayRef(extra?.packRef ?? root.packRef)}; remove it from the staged closure.`,
      );
    }
  }
}

function validateVisualFallbacks(pack: AdmittedPack, available: ReadonlyMap<string, AdmittedPack>): void {
  if (pack.manifest.kind === "theme") return;

  const theme = available.get(exactRefKey(pack.manifest.themePack));
  if (theme === undefined) {
    throw new PackDependencyClosureError(
      `Pack ${displayRef(pack.packRef)} requires exact theme ${displayRef(pack.manifest.themePack)}, but those admitted bytes were not supplied.`,
    );
  }
  if (theme.manifest.kind !== "theme") {
    throw new PackDependencyClosureError(
      `Pack ${displayRef(pack.packRef)} pins ${displayRef(theme.packRef)} as its theme, but the exact admitted dependency is kind ${theme.manifest.kind}; supply a theme pack.`,
    );
  }

  const visuals =
    pack.manifest.kind === "catalogue"
      ? pack.manifest.entries.map((entry) => ({
          label: `definition ${entry.definition.definitionId}`,
          visual: entry.visual,
        }))
      : [{ label: `target ${pack.manifest.target.localDefinitionId}`, visual: pack.manifest.visual }];

  for (const { label, visual } of visuals) {
    validateVisualFallback(pack.packRef, label, visual, theme.packRef, theme.manifest);
  }
}

function validateVisualFallback(
  packRef: Readonly<PackRef>,
  label: string,
  visual: PublishedBadgeVisual,
  themeRef: Readonly<PackRef>,
  theme: ThemePackManifest,
): void {
  const capabilities = [
    ["shape", visual.renderRecipe.shape, theme.theme.shapes],
    ["material", visual.renderRecipe.material, theme.theme.materials],
  ] as const;
  for (const [capability, selected, supported] of capabilities) {
    if (!(supported as readonly string[]).includes(selected)) {
      throw new PackDependencyClosureError(
        `Pack ${displayRef(packRef)} ${label} uses ${capability} ${selected}, but exact theme ${displayRef(themeRef)} supports ${supported.join(", ")}; choose a supported ${capability} or publish with a theme that declares it.`,
      );
    }
  }

  const expected = theme.theme.fallbackTemplates;
  const references = [
    ["front", visual.fallback.frontTemplateId, expected.front.templateId],
    ["edge", visual.fallback.edgeTemplateId, expected.edge.templateId],
    ["back", visual.fallback.backTemplateId, expected.back.templateId],
  ] as const;

  for (const [face, actualTemplateId, expectedTemplateId] of references) {
    if (actualTemplateId !== expectedTemplateId) {
      throw new PackDependencyClosureError(
        `Pack ${displayRef(packRef)} ${label} names ${actualTemplateId} as its ${face} fallback template, but exact theme ${displayRef(themeRef)} provides ${expectedTemplateId}; republish the visual against that exact theme.`,
      );
    }
  }
}

function exactRefKey(reference: Readonly<PackRef>): string {
  return `${reference.packId}@${reference.version}#${reference.packDigest}`;
}

function releaseKey(reference: Readonly<PackRef>): string {
  return `${reference.packId}@${reference.version}`;
}

function displayRef(reference: Readonly<PackRef>): string {
  return exactRefKey(reference);
}
