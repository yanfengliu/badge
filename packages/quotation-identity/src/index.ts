export const QUOTATION_ID_LENGTH_LIMIT = 128;

const defaultIgnorablePattern = /\p{Default_Ignorable_Code_Point}/gu;

export function canonicalQuotationTextKey(text: string): string {
  let caseless = text.normalize("NFKD").replace(defaultIgnorablePattern, "");
  for (;;) {
    const next = caseless.toUpperCase().toLowerCase().normalize("NFKD").replace(defaultIgnorablePattern, "");
    if (next === caseless) break;
    caseless = next;
  }
  return caseless
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
