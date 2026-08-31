import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const channels = hex.match(/[\da-f]{2}/giu)?.map((value) => channel(Number.parseInt(value, 16)));
  if (!channels || channels.length !== 3) throw new Error(`Invalid test color ${hex}.`);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((left, right) => right - left);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe("host loading shell styles", () => {
  it("keeps the small Studio loading label above WCAG AA contrast", () => {
    const css = readFileSync(new URL("./host-loading.css", import.meta.url), "utf8");
    const accent = /--host-loading-studio-accent:\s*(#[\da-f]{6})/iu.exec(css)?.[1];
    const background = /--host-loading-studio-background:\s*(#[\da-f]{6})/iu.exec(css)?.[1];
    if (!accent || !background) throw new Error("Studio loading colors must stay explicit and testable.");

    expect(contrastRatio(accent, background)).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain("color: var(--host-loading-studio-accent)");
  });
});
