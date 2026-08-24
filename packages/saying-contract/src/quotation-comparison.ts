import { normalizePromptText } from "./text-safety.ts";

interface QuotationRecordIdentity {
  readonly id: string;
  readonly text: string;
  readonly person: string;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
}

export function quotationRecordsMatch(
  left: QuotationRecordIdentity,
  right: QuotationRecordIdentity,
): boolean {
  return (
    left.id === right.id &&
    left.text === right.text &&
    left.person === right.person &&
    left.sourceTitle === right.sourceTitle &&
    left.sourceUrl === right.sourceUrl
  );
}

export function isQuotationStyled(value: string): boolean {
  return /^(?:"[^"]+"|“[^”]+”)(?:\s+[—–-]\s+\S.*)?$/u.test(value);
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function hasSuppliedPersonAttribution(value: string, person: string): boolean {
  const normalizedValue = normalizePromptText(value);
  const normalizedPerson = escapeRegularExpression(normalizePromptText(person));
  const speechVerb = "(?:said|says|wrote|writes|observed|remarked)";
  const prefix = new RegExp(
    `(?:according to\\s+${normalizedPerson}|as\\s+${normalizedPerson}\\s+${speechVerb}|${normalizedPerson}\\s+${speechVerb})(?=[\\s,:;.!?]|$)`,
    "iu",
  );
  const nameLabel = new RegExp(`${normalizedPerson}\\s*:`, "iu");
  const suffix = new RegExp(`[—–-]\\s*${normalizedPerson}(?:\\s*[,.(].*)?\\s*$`, "iu");
  return prefix.test(normalizedValue) || nameLabel.test(normalizedValue) || suffix.test(normalizedValue);
}

function canonicalQuotationComparisonText(value: string): string {
  const normalized = normalizePromptText(value);
  const attributedMatch = /^(?:"([^"]+)"|“([^”]+)”)(?:\s+[—–-]\s+\S.*)?$/u.exec(normalized);
  const unwrapped = attributedMatch ? (attributedMatch[1] ?? attributedMatch[2] ?? normalized) : normalized;
  return unwrapped
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function boundedEditDistance(left: string, right: string): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  let previous = rightCharacters.map((_, index) => index + 1);
  previous.unshift(0);

  for (let leftIndex = 0; leftIndex < leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < rightCharacters.length; rightIndex += 1) {
      current.push(
        Math.min(
          current[rightIndex]! + 1,
          previous[rightIndex + 1]! + 1,
          previous[rightIndex]! + (leftCharacters[leftIndex] === rightCharacters[rightIndex] ? 0 : 1),
        ),
      );
    }
    previous = current;
  }

  return previous[rightCharacters.length]!;
}

export function tooCloselyMatchesQuotation(saying: string, quotation: string): boolean {
  const candidate = canonicalQuotationComparisonText(saying);
  const reference = canonicalQuotationComparisonText(quotation);
  if (candidate === reference) return true;
  if (reference.length >= 20 && candidate.includes(reference)) return true;
  if (
    candidate.length >= Math.max(20, Math.floor(reference.length * 0.75)) &&
    reference.includes(candidate)
  ) {
    return true;
  }
  const longerLength = Math.max(candidate.length, reference.length);
  if (longerLength < 20) return false;
  const permittedDistance = Math.max(2, Math.floor(longerLength * 0.12));
  if (Math.abs(candidate.length - reference.length) > permittedDistance) return false;
  return boundedEditDistance(candidate, reference) <= permittedDistance;
}
