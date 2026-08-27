const thumbnailModules = import.meta.glob("../../../packages/catalogue-authoring/assets/*/thumbnails/*.jpg", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
}) as Readonly<Record<string, string>>;

const thumbnailUrlsByKey = new Map(
  Object.entries(thumbnailModules).map(([path, thumbnailUrl]) => [thumbnailKeyFromPath(path), thumbnailUrl]),
);

function thumbnailKeyFromPath(path: string): string {
  const match = /\/assets\/([^/]+)\/thumbnails\/([^/]+)$/u.exec(path);
  if (!match) {
    throw new Error(
      `Discovery thumbnail module ${path} does not match assets/<catalogue>/thumbnails/<file>; keep Archive media keys catalogue-qualified.`,
    );
  }
  return `${match[1]}/${match[2]}`;
}

export function resolveDiscoveryThumbnail(thumbnailKey: string): string | null {
  return thumbnailUrlsByKey.get(thumbnailKey) ?? null;
}

export function discoveryThumbnailKeys(): readonly string[] {
  return [...thumbnailUrlsByKey.keys()].sort();
}
