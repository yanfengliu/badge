const sourceModules = import.meta.glob("../../../packages/catalogue-authoring/assets/national-parks/*.jpg", {
  eager: true,
  import: "default",
  query: "?url",
}) as Readonly<Record<string, string>>;

const sourceUrlsByFileName = new Map(
  Object.entries(sourceModules).map(([path, sourceUrl]) => [
    path.slice(path.lastIndexOf("/") + 1),
    sourceUrl,
  ]),
);

const thumbnailModules = import.meta.glob(
  "../../../packages/catalogue-authoring/assets/national-parks/thumbnails/*.jpg",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Readonly<Record<string, string>>;

const thumbnailUrlsByFileName = new Map(
  Object.entries(thumbnailModules).map(([path, sourceUrl]) => [
    path.slice(path.lastIndexOf("/") + 1),
    sourceUrl,
  ]),
);

export type NationalParkMediaKind = "source-study" | "list-thumbnail";

export interface NationalParkMediaIssue {
  kind: NationalParkMediaKind;
  fileName: string;
  message: string;
  recovery: string;
}

export type NationalParkMediaResolution =
  { status: "ready"; url: string } | { status: "missing"; issue: NationalParkMediaIssue };

export interface NationalParkMediaResolver {
  sourceStudy(fileName: string): NationalParkMediaResolution;
  listThumbnail(fileName: string): NationalParkMediaResolution;
}

export function createNationalParkMediaResolver(
  sourceUrls: ReadonlyMap<string, string>,
  thumbnailUrls: ReadonlyMap<string, string>,
): NationalParkMediaResolver {
  return {
    sourceStudy: (fileName) =>
      resolveMediaUrl(sourceUrls, fileName, "source-study", {
        message: "The selected national-park source study is absent from the Studio bundle.",
        recovery:
          "Restore the reviewed source under packages/catalogue-authoring/assets/national-parks, run npm run catalogue:refresh-integrity, then reload Badge Studio.",
      }),
    listThumbnail: (fileName) =>
      resolveMediaUrl(thumbnailUrls, fileName, "list-thumbnail", {
        message: "The national-park list thumbnail is absent from the Studio bundle.",
        recovery:
          "Run npm run catalogue:thumbnails, then npm run catalogue:refresh-integrity, and reload Badge Studio.",
      }),
  };
}

export const nationalParkMediaResolver = createNationalParkMediaResolver(
  sourceUrlsByFileName,
  thumbnailUrlsByFileName,
);

export function nationalParkSourceFileNames(): readonly string[] {
  return [...sourceUrlsByFileName.keys()].sort();
}

export function nationalParkThumbnailFileNames(): readonly string[] {
  return [...thumbnailUrlsByFileName.keys()].sort();
}

function resolveMediaUrl(
  urls: ReadonlyMap<string, string>,
  fileName: string,
  kind: NationalParkMediaKind,
  copy: { message: string; recovery: string },
): NationalParkMediaResolution {
  const url = urls.get(fileName);
  return url
    ? { status: "ready", url }
    : {
        status: "missing",
        issue: {
          kind,
          fileName,
          message: copy.message,
          recovery: copy.recovery,
        },
      };
}
