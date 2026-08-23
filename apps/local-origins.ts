export type BadgeApp = "archive" | "studio";

export function companionAppHref(currentHref: string, target: BadgeApp): string {
  const current = new URL(currentHref);
  current.pathname = target === "archive" ? "/" : "/studio/";
  current.search = "";
  current.hash = "";
  return current.toString();
}
