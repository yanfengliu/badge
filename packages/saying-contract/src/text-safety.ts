const controlCharacterPattern = /\p{Cc}/u;
const defaultIgnorablePattern = /\p{Default_Ignorable_Code_Point}/gu;
const bidiControlPattern = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const normalizableWhitespaceControlPattern = /^[\t\n\v\f\r]$/u;
const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export function normalizePromptText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export function countGraphemes(value: string): number {
  return Array.from(graphemeSegmenter.segment(value)).length;
}

export function hasVisibleContent(value: string): boolean {
  return value.replace(defaultIgnorablePattern, "").trim().length > 0;
}

export function hasControlCharacter(value: string): boolean {
  return controlCharacterPattern.test(value);
}

export function hasBidiControl(value: string): boolean {
  return bidiControlPattern.test(value);
}

export function hasForbiddenOutputControl(value: string): boolean {
  for (const character of value) {
    if (controlCharacterPattern.test(character) && !normalizableWhitespaceControlPattern.test(character)) {
      return true;
    }
  }
  return false;
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
