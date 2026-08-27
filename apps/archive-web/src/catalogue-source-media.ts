const sourceModules = import.meta.glob(
  [
    "../../../packages/catalogue-authoring/assets/*/*.jpg",
    // Yosemite's study is deduplicated in favor of the published starter badge and stays out
    // of the shipped activation tier.
    "!../../../packages/catalogue-authoring/assets/national-parks/yosemite.jpg",
  ],
  {
    eager: true,
    import: "default",
    query: "?url&no-inline",
  },
) as Readonly<Record<string, string>>;

const sourceUrlsByKey = new Map(
  Object.entries(sourceModules).map(([path, sourceUrl]) => [sourceKeyFromPath(path), sourceUrl]),
);

function sourceKeyFromPath(path: string): string {
  const match = /\/assets\/([^/]+)\/([^/]+\.jpg)$/u.exec(path);
  if (!match) {
    throw new Error(
      `Catalogue source module ${path} does not match assets/<catalogue>/<file>.jpg; keep Archive media keys catalogue-qualified.`,
    );
  }
  return `${match[1]}/${match[2]}`;
}

export function resolveCatalogueSourceUrl(assetKey: string): string | null {
  return sourceUrlsByKey.get(assetKey) ?? null;
}

export function catalogueSourceKeys(): readonly string[] {
  return [...sourceUrlsByKey.keys()].sort();
}
