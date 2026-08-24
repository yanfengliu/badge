export type AcceptedSayingProtection = { readonly kind: "attributed" } | null;

const attributedQuotationPattern = /^(?:"[^"\r\n]+"|“[^”\r\n]+”)\s+[—–-]\s+\S(?:.*\S)?$/u;

export function isAttributedAcceptedSaying(value: string | null | undefined): boolean {
  return value ? attributedQuotationPattern.test(value.trim()) : false;
}

export function protectAcceptedSaying(value: string | null | undefined): AcceptedSayingProtection {
  return isAttributedAcceptedSaying(value) ? { kind: "attributed" } : null;
}

export function manualSayingEditorStartValue(
  value: string | null | undefined,
  protection: AcceptedSayingProtection = protectAcceptedSaying(value),
): string {
  return protection ? "" : (value ?? "");
}
