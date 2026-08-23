function offerDownload(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes.slice().buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function offerPackClosureDownload(packBytes: Uint8Array, themeBytes: Uint8Array) {
  offerDownload(packBytes, "yosemite-visual.badgepack");
  setTimeout(() => offerDownload(themeBytes, "heirloom.badgetheme"), 0);
}
