export type BadgeApp = "archive" | "studio";

export function companionAppHref(currentHref: string, target: BadgeApp): string {
  const current = new URL(currentHref);
  const currentPort = Number(current.port);
  const companionPort = target === "archive" ? currentPort - 1 : currentPort + 1;
  if (
    !Number.isSafeInteger(currentPort) ||
    currentPort < 1024 ||
    currentPort > 65_535 ||
    companionPort < 1024 ||
    companionPort > 65_535
  ) {
    throw new Error(`Badge cannot locate its companion from local port ${current.port || "(default)"}.`);
  }
  current.port = String(companionPort);
  current.pathname = "/";
  current.search = "";
  current.hash = "";
  return current.toString();
}
