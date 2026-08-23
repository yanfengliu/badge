export type BadgeApp = "archive" | "studio";

export function companionAppHref(currentHref: string, target: BadgeApp): string {
  const current = new URL(currentHref);
  const disposableDevelopment = current.port === "5173" || current.port === "5174";
  current.port =
    target === "archive"
      ? disposableDevelopment
        ? "5173"
        : "4173"
      : disposableDevelopment
        ? "5174"
        : "4174";
  current.pathname = "/";
  current.search = "";
  current.hash = "";
  return current.toString();
}
