import type { ActivationRecord, ArchiveRecord, ArchiveState, CollectionRef } from "@badge/archive-domain";
import { STARTER_PACK_ID } from "@badge/catalogue-fixtures/archive";
import { CATALOGUE_PACK_ID } from "@badge/catalogue-fixtures/catalogue-pack";
import { discoveryBadges, discoverySets, type DiscoverySet } from "@badge/catalogue-fixtures/discovery";

const canonicalSetPackIds = new Set([STARTER_PACK_ID, CATALOGUE_PACK_ID]);

export type CollectedArchiveRecord = ArchiveRecord & {
  readonly lifecycle: "earned";
  readonly activation: ActivationRecord;
};

export interface CollectionShelf {
  readonly key: string;
  readonly setId: string | null;
  readonly title: string;
  readonly description: string;
  readonly totalCount: number;
  readonly collectedCount: number;
  readonly records: readonly CollectedArchiveRecord[];
}

export interface CollectionStats {
  readonly collectedCount: number;
  readonly setCount: number;
  readonly yearsLabel: string;
  readonly latestRecord: CollectedArchiveRecord | null;
}

export interface ReplaySetLink {
  readonly key: string;
  readonly setId: string | null;
  readonly title: string;
}

function isCollected(record: ArchiveRecord): record is CollectedArchiveRecord {
  return record.lifecycle === "earned" && record.activation !== null;
}

export function collectionRefKey(ref: CollectionRef): string {
  return ref.namespace === "local" ? `local:${ref.collectionId}` : `pack:${ref.packId}:${ref.collectionId}`;
}

function normalized(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function humanizeIdentifier(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function discoverySetForRef(ref: CollectionRef): DiscoverySet | undefined {
  if (ref.namespace !== "pack" || !canonicalSetPackIds.has(ref.packId)) return undefined;
  return discoverySets.find((set) => set.setId === ref.collectionId);
}

function fallbackCollectionTitle(ref: CollectionRef): string {
  const qualifier = ref.namespace === "local" ? "Local" : `Pack ${ref.packId}`;
  return `${humanizeIdentifier(ref.collectionId)} · ${qualifier}`;
}

export function replaySetLinks(record: ArchiveRecord): readonly ReplaySetLink[] {
  const seen = new Set<string>();
  return record.collectionRefs.flatMap((ref) => {
    const key = collectionRefKey(ref);
    if (seen.has(key)) return [];
    seen.add(key);
    const set = discoverySetForRef(ref);
    return [
      {
        key,
        setId: set?.setId ?? null,
        title: set?.title ?? fallbackCollectionTitle(ref),
      },
    ];
  });
}

function latestFirst(left: CollectedArchiveRecord, right: CollectedArchiveRecord): number {
  return (
    Date.parse(right.activation.activatedAt) - Date.parse(left.activation.activatedAt) ||
    left.recordId.localeCompare(right.recordId)
  );
}

export function buildCollectionShelves(state: ArchiveState): readonly CollectionShelf[] {
  const collected = state.records.filter(isCollected);
  const canonical = discoverySets.flatMap((set) => {
    const records = collected
      .filter((record) => record.collectionRefs.some((ref) => discoverySetForRef(ref)?.setId === set.setId))
      .sort(latestFirst);
    if (records.length === 0) return [];
    return [
      {
        key: `pack:${STARTER_PACK_ID}:${set.setId}`,
        setId: set.setId,
        title: set.title,
        description: set.description,
        totalCount: discoveryBadges.filter((badge) => badge.setIds.includes(set.setId)).length,
        collectedCount: records.length,
        records,
      } satisfies CollectionShelf,
    ];
  });

  const unknownRefs = new Map<string, CollectionRef>();
  collected.forEach((record) =>
    record.collectionRefs.forEach((ref) => {
      if (discoverySetForRef(ref)) return;
      unknownRefs.set(collectionRefKey(ref), ref);
    }),
  );
  const unknown = [...unknownRefs.entries()].map(([key, ref]) => {
    const records = collected
      .filter((record) => record.collectionRefs.some((candidate) => collectionRefKey(candidate) === key))
      .sort(latestFirst);
    const totalCount = state.records.filter((record) =>
      record.collectionRefs.some((candidate) => collectionRefKey(candidate) === key),
    ).length;
    return {
      key,
      setId: null,
      title: fallbackCollectionTitle(ref),
      description: "A personal set represented by memories in this Archive.",
      totalCount: Math.max(totalCount, records.length),
      collectedCount: records.length,
      records,
    } satisfies CollectionShelf;
  });

  return [...canonical, ...unknown];
}

export function collectionStats(state: ArchiveState): CollectionStats {
  const collected = state.records.filter(isCollected).sort(latestFirst);
  const setKeys = new Set(collected.flatMap((record) => record.collectionRefs.map(collectionRefKey)));
  const years = collected.flatMap((record) => [
    Number(record.activation.occurredStart.slice(0, 4)),
    Number(record.activation.occurredEnd.slice(0, 4)),
  ]);
  const firstYear = years.length > 0 ? Math.min(...years) : null;
  const lastYear = years.length > 0 ? Math.max(...years) : null;
  const yearsLabel =
    firstYear === null || lastYear === null
      ? "—"
      : firstYear === lastYear
        ? `${firstYear}`
        : `${firstYear}–${lastYear}`;
  return {
    collectedCount: collected.length,
    setCount: setKeys.size,
    yearsLabel,
    latestRecord: collected[0] ?? null,
  };
}

export function filterCollectionShelves(
  shelves: readonly CollectionShelf[],
  query: string,
): readonly CollectionShelf[] {
  const terms = normalized(query).split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return shelves;
  return shelves.flatMap((shelf) => {
    const shelfHaystack = normalized(`${shelf.title} ${shelf.description}`);
    if (terms.every((term) => shelfHaystack.includes(term))) return [shelf];
    const records = shelf.records.filter((record) => {
      const haystack = normalized(
        [record.title, record.criterion, record.description, record.note, record.acceptedSaying]
          .filter((value): value is string => Boolean(value))
          .join(" "),
      );
      return terms.every((term) => haystack.includes(term));
    });
    return records.length > 0 ? [{ ...shelf, records }] : [];
  });
}
