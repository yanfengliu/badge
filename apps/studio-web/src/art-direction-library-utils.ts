import { findArtStyle, type ArtStyleDefinition } from "@badge/catalogue-authoring";

export function requireStyle(styleId: string): ArtStyleDefinition {
  const style = findArtStyle(styleId);
  if (!style) throw new Error(`Art style ${styleId} is unavailable.`);
  return style;
}

export function matchesQuery(query: string, values: readonly string[]): boolean {
  const terms = normalizedSearch(query).split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalizedSearch(values.join(" "));
  return terms.every((term) => haystack.includes(term));
}

function normalizedSearch(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function writeToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
  return navigator.clipboard.writeText(text);
}
