import { QUOTATION_ID_LENGTH_LIMIT, canonicalQuotationTextKey } from "@badge/quotation-identity";

import type {
  CatalogueQuotationBank,
  CatalogueQuotationSlot,
  CatalogueQuotationSourceRecord,
} from "./types.ts";

const DEFINITION_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;
const QUOTATION_ID_PATTERN = /^historic-quotation\/[a-z0-9][a-z0-9._:-]*$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

interface UntrustedQuotationRow {
  readonly definitionId?: unknown;
  readonly slot?: unknown;
  readonly id?: unknown;
  readonly text?: unknown;
  readonly person?: unknown;
  readonly personWikipediaUrl?: unknown;
  readonly sourceTitle?: unknown;
  readonly sourceUrl?: unknown;
  readonly sourceSha256?: unknown;
}

function requiredString(
  row: UntrustedQuotationRow,
  field: keyof UntrustedQuotationRow,
  location: string,
): string {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Catalogue quotation ${location} has no nonempty ${field}; repair the curated row.`);
  }
  return value;
}

function exactHttpsUrl(value: string, field: string, location: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Catalogue quotation ${location} has invalid ${field} ${JSON.stringify(value)}.`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`Catalogue quotation ${location} ${field} must use HTTPS; found ${value}.`);
  }
  return url;
}

function parseRow(serialized: string, sourceLabel: string, index: number): CatalogueQuotationSourceRecord {
  const location = `${sourceLabel} row ${index + 1}`;
  let untrusted: unknown;
  try {
    untrusted = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new Error(`Catalogue quotation ${location} is not valid JSON.`, { cause: error });
  }
  if (typeof untrusted !== "object" || untrusted === null || Array.isArray(untrusted)) {
    throw new Error(`Catalogue quotation ${location} must be a JSON object.`);
  }
  const row = untrusted as UntrustedQuotationRow;
  const definitionId = requiredString(row, "definitionId", location);
  if (!DEFINITION_ID_PATTERN.test(definitionId)) {
    throw new Error(`Catalogue quotation ${location} has invalid definitionId ${definitionId}.`);
  }
  if (row.slot !== 1 && row.slot !== 2) {
    throw new Error(`Catalogue quotation ${location} must use numeric slot 1 or 2.`);
  }
  const slot: CatalogueQuotationSlot = row.slot;
  const quotationId = requiredString(row, "id", location);
  const unqualifiedQuotationId = quotationId.replace(/^historic-quotation\//u, "");
  if (!QUOTATION_ID_PATTERN.test(quotationId) || unqualifiedQuotationId.length > QUOTATION_ID_LENGTH_LIMIT) {
    throw new Error(`Catalogue quotation ${location} has invalid stable ID ${quotationId}.`);
  }
  const text = requiredString(row, "text", location);
  const textCodePoints = Array.from(text).length;
  if (textCodePoints < 20 || textCodePoints > 300) {
    throw new Error(`Catalogue quotation ${location} text must contain 20 to 300 Unicode code points.`);
  }
  const personName = requiredString(row, "person", location);
  const personWikipediaUrl = requiredString(row, "personWikipediaUrl", location);
  const wikipedia = exactHttpsUrl(personWikipediaUrl, "personWikipediaUrl", location);
  if (wikipedia.hostname !== "en.wikipedia.org" || !wikipedia.pathname.startsWith("/wiki/")) {
    throw new Error(
      `Catalogue quotation ${location} must bind the historical person to an English-Wikipedia article.`,
    );
  }
  const sourceTitle = requiredString(row, "sourceTitle", location);
  const sourceUrl = requiredString(row, "sourceUrl", location);
  exactHttpsUrl(sourceUrl, "sourceUrl", location);
  const sourceSha256 = requiredString(row, "sourceSha256", location);
  if (!SHA256_PATTERN.test(sourceSha256)) {
    throw new Error(`Catalogue quotation ${location} has invalid sourceSha256 ${sourceSha256}.`);
  }
  return Object.freeze({
    definitionId,
    slot,
    quotationId: quotationId as `historic-quotation/${string}`,
    text,
    personName,
    personWikipediaUrl,
    sourceTitle,
    sourceUrl,
    sourceSha256,
  });
}

export function buildCatalogueQuotationRegistry(
  sources: readonly { readonly label: string; readonly rows: readonly string[] }[],
): Readonly<Record<string, CatalogueQuotationBank>> {
  const records = sources.flatMap(({ label, rows }) =>
    rows.map((serialized, index) => parseRow(serialized, label, index)),
  );
  if (records.length !== 700) {
    throw new Error(
      `Catalogue quotation registry has ${records.length} records; curate exactly two for each of 350 badges.`,
    );
  }
  const quotationIds = new Set<string>();
  const quotationTextKeys = new Map<string, string>();
  const grouped = new Map<string, CatalogueQuotationSourceRecord[]>();
  for (const record of records) {
    if (quotationIds.has(record.quotationId)) {
      throw new Error(`Catalogue quotation ID ${record.quotationId} is repeated; assign one immutable ID.`);
    }
    quotationIds.add(record.quotationId);
    const textKey = canonicalQuotationTextKey(record.text);
    const previousTextOwner = quotationTextKeys.get(textKey);
    if (previousTextOwner) {
      throw new Error(
        `Catalogue quotation ${record.quotationId} repeats canonical wording owned by ${previousTextOwner}.`,
      );
    }
    quotationTextKeys.set(textKey, record.quotationId);
    const bank = grouped.get(record.definitionId) ?? [];
    bank.push(record);
    grouped.set(record.definitionId, bank);
  }
  if (grouped.size !== 350) {
    throw new Error(`Catalogue quotation registry covers ${grouped.size} badges; expected exactly 350.`);
  }
  const entries = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([definitionId, unsorted]) => {
      const sorted = [...unsorted].sort((left, right) => left.slot - right.slot);
      if (sorted.length !== 2 || sorted[0]?.slot !== 1 || sorted[1]?.slot !== 2) {
        throw new Error(
          `Catalogue badge ${definitionId} must own exactly quotation slots 1 and 2; found ${sorted.map(({ slot }) => slot).join(", ") || "none"}.`,
        );
      }
      const bank: CatalogueQuotationBank = [sorted[0]!, sorted[1]!];
      return [definitionId, Object.freeze(bank)] as const;
    });
  return Object.freeze(Object.fromEntries(entries));
}
