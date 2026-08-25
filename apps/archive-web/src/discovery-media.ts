const thumbnailModules = import.meta.glob(
  "../../../packages/catalogue-authoring/assets/national-parks/thumbnails/*.jpg",
  {
    eager: true,
    import: "default",
    query: "?url&no-inline",
  },
) as Readonly<Record<string, string>>;

const thumbnailUrlsByFileName = new Map(
  Object.entries(thumbnailModules).map(([path, thumbnailUrl]) => [
    path.slice(path.lastIndexOf("/") + 1),
    thumbnailUrl,
  ]),
);

export function resolveDiscoveryThumbnail(fileName: string): string | null {
  return thumbnailUrlsByFileName.get(fileName) ?? null;
}

export function discoveryThumbnailFileNames(): readonly string[] {
  return [...thumbnailUrlsByFileName.keys()].sort();
}
