const thumbnailModules = import.meta.glob("../../../packages/catalogue-authoring/assets/*/thumbnails/*.jpg", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
}) as Readonly<Record<string, string>>;

const detailModules = import.meta.glob("../../../packages/catalogue-authoring/assets/*/details/*.jpg", {
  import: "default",
  query: "?url&no-inline",
}) as Readonly<Record<string, () => Promise<string>>>;

const thumbnailUrlsByKey = new Map(
  Object.entries(thumbnailModules).map(([path, thumbnailUrl]) => [thumbnailKeyFromPath(path), thumbnailUrl]),
);
const detailLoadersByKey = new Map(
  Object.entries(detailModules).map(([path, detailLoader]) => [detailKeyFromPath(path), detailLoader]),
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

function detailKeyFromPath(path: string): string {
  const match = /\/assets\/([^/]+)\/details\/([^/]+)$/u.exec(path);
  if (!match) {
    throw new Error(
      `Discovery detail module ${path} does not match assets/<catalogue>/details/<file>; keep Archive media keys catalogue-qualified.`,
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

export function discoveryDetailKeys(): readonly string[] {
  return [...detailLoadersByKey.keys()].sort();
}

export async function resolveDiscoveryDetail(thumbnailKey: string): Promise<string | null> {
  const loader = detailLoadersByKey.get(thumbnailKey);
  return loader ? loader() : null;
}
