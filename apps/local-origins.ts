export type BadgeApp = "archive" | "studio";

declare const __BADGE_LEGACY_COMPANION_ORIGIN__: string | undefined;

function compiledLegacyCompanionOrigin(): string | null {
  return typeof __BADGE_LEGACY_COMPANION_ORIGIN__ === "string" ? __BADGE_LEGACY_COMPANION_ORIGIN__ : null;
}

export function companionAppHref(
  currentHref: string,
  target: BadgeApp,
  legacyCompanionOrigin = compiledLegacyCompanionOrigin(),
): string {
  const current = new URL(legacyCompanionOrigin ?? currentHref);
  current.pathname = legacyCompanionOrigin ? "/" : target === "archive" ? "/" : "/studio/";
  current.search = "";
  current.hash = "";
  return current.toString();
}
