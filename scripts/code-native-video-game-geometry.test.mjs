import { createHash } from "node:crypto";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { codeNativeVideoGameRecipes } from "../packages/catalogue-authoring/src/code-native-art-recipes-video-games.ts";
import { renderFlatRecipe, resizeRgbaBilinear } from "./code-native-art/flat-raster.mjs";

const EXACT_SIZE = 48;
const MINIMUM_SIBLING_DISTANCE = 0.045;
const GEOMETRY_DISTANCE_CAP = 6;

describe("video-game code-native geometry signatures", () => {
  it("rejects exact-48 structural siblings independently of palette labels", () => {
    const structures = new Map(
      codeNativeVideoGameRecipes.map((recipe) => [recipe.slug, exact48VisiblePartition(recipe)]),
    );
    const paletteControl = codeNativeVideoGameRecipes[0];
    const relabeledControl = {
      ...paletteControl,
      palette: paletteControl.palette.map((entry, index) => ({
        ...entry,
        name: `relabeled ${index}`,
        hex: paletteControl.palette[(index + 2) % paletteControl.palette.length].hex,
      })),
    };
    const controlStructure = exact48VisiblePartition(paletteControl);
    const relabeledStructure = exact48VisiblePartition(relabeledControl);
    expect(structureHash(controlStructure)).toBe(structureHash(relabeledStructure));
    expect(structureDistance(controlStructure, relabeledStructure).distance).toBe(0);

    const nearestPairs = allPairs(structures).sort((left, right) => left.distance - right.distance);
    expect(structures.size).toBe(50);
    expect(nearestPairs).toHaveLength((50 * 49) / 2);
    const diagnostic = nearestPairs
      .slice(0, 12)
      .map(
        ({ left, right, distance, boundary, silhouette }) =>
          `${left}/${right}: ${distance.toFixed(6)} (boundary ${boundary.toFixed(6)}, silhouette ${silhouette.toFixed(6)})`,
      )
      .join("\n");
    process.stdout.write(
      `\nExact-48 game geometry gate: 50 recipes, ${nearestPairs.length} pairs, nearest ${diagnostic.replaceAll("\n", "; ")}.\n`,
    );
    expect(nearestPairs[0].distance, diagnostic).toBeGreaterThanOrEqual(MINIMUM_SIBLING_DISTANCE);
    expect(
      structureDistance(structures.get("monument-valley"), structures.get("the-sims")).distance,
      diagnostic,
    ).toBeGreaterThanOrEqual(MINIMUM_SIBLING_DISTANCE);
  }, 60_000);
});

function exact48VisiblePartition(recipe) {
  const coverages = Array.from({ length: recipe.palette.length }, (_, targetColor) => {
    const image = resizeRgbaBilinear(
      renderFlatRecipe({
        ...recipe,
        palette: [
          { name: "partition absent", hex: "#000000" },
          { name: "partition present", hex: "#FFFFFF" },
        ],
        backgroundColor: recipe.backgroundColor === targetColor ? 1 : 0,
        commands: recipe.commands.map((command) => ({
          ...command,
          color: command.color === targetColor ? 1 : 0,
        })),
      }),
      EXACT_SIZE,
    );
    return Uint8Array.from({ length: EXACT_SIZE * EXACT_SIZE }, (_, index) => image.data[index * 4]);
  });
  const visibleColor = new Uint8Array(EXACT_SIZE * EXACT_SIZE);
  const tieCategory = 255;
  for (let index = 0; index < visibleColor.length; index += 1) {
    let bestColor = 0;
    let bestCoverage = -1;
    let tied = false;
    for (let color = 0; color < coverages.length; color += 1) {
      if (coverages[color][index] > bestCoverage) {
        bestColor = color;
        bestCoverage = coverages[color][index];
        tied = false;
      } else if (coverages[color][index] === bestCoverage) {
        tied = true;
      }
    }
    visibleColor[index] = tied ? tieCategory : bestColor;
  }
  const partition = canonicalizeCategories(visibleColor, recipe.backgroundColor);
  const silhouette = Uint8Array.from(coverages[recipe.backgroundColor], (coverage) =>
    coverage >= 128 ? 0 : 1,
  );
  const boundary = categoricalBoundary(partition, EXACT_SIZE);
  return {
    partition,
    silhouette,
    boundary,
    silhouetteDistance: distanceTransform(silhouette, EXACT_SIZE, GEOMETRY_DISTANCE_CAP),
    boundaryDistance: distanceTransform(boundary, EXACT_SIZE, GEOMETRY_DISTANCE_CAP),
  };
}

function allPairs(structures) {
  const entries = [...structures.entries()];
  const pairs = [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      pairs.push({
        left: entries[leftIndex][0],
        right: entries[rightIndex][0],
        ...structureDistance(entries[leftIndex][1], entries[rightIndex][1]),
      });
    }
  }
  return pairs;
}

function structureDistance(left, right) {
  let boundaryDistance = 0;
  let boundaryHamming = 0;
  let silhouetteDistance = 0;
  let silhouetteHamming = 0;
  for (let index = 0; index < left.boundary.length; index += 1) {
    boundaryDistance += Math.abs(left.boundaryDistance[index] - right.boundaryDistance[index]);
    boundaryHamming += left.boundary[index] === right.boundary[index] ? 0 : 1;
    silhouetteDistance += Math.abs(left.silhouetteDistance[index] - right.silhouetteDistance[index]);
    silhouetteHamming += left.silhouette[index] === right.silhouette[index] ? 0 : 1;
  }
  const denominator = left.boundary.length;
  boundaryDistance /= denominator * GEOMETRY_DISTANCE_CAP;
  boundaryHamming /= denominator;
  silhouetteDistance /= denominator * GEOMETRY_DISTANCE_CAP;
  silhouetteHamming /= denominator;
  const boundary = boundaryDistance * 0.72 + boundaryHamming * 0.28;
  const silhouette = silhouetteDistance * 0.72 + silhouetteHamming * 0.28;
  return { boundary, silhouette, distance: boundary * 0.72 + silhouette * 0.28 };
}

function structureHash(structure) {
  return createHash("sha256")
    .update(structure.partition)
    .update(structure.boundary)
    .update(structure.silhouette)
    .digest("hex");
}

function categoricalBoundary(values, size) {
  const output = new Uint8Array(values.length);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const value = values[index];
      output[index] =
        (x > 0 && values[index - 1] !== value) ||
        (x + 1 < size && values[index + 1] !== value) ||
        (y > 0 && values[index - size] !== value) ||
        (y + 1 < size && values[index + size] !== value)
          ? 1
          : 0;
    }
  }
  return output;
}

function canonicalizeCategories(values, backgroundColor) {
  const remap = new Map([[backgroundColor, 0]]);
  let next = 1;
  return Uint8Array.from(values, (value) => {
    if (!remap.has(value)) remap.set(value, next++);
    return remap.get(value);
  });
}

function distanceTransform(mask, size, cap) {
  const output = Uint8Array.from(mask, (value) => (value ? 0 : cap));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      if (x > 0) output[index] = Math.min(output[index], output[index - 1] + 1);
      if (y > 0) output[index] = Math.min(output[index], output[index - size] + 1);
    }
  }
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = size - 1; x >= 0; x -= 1) {
      const index = y * size + x;
      if (x + 1 < size) output[index] = Math.min(output[index], output[index + 1] + 1);
      if (y + 1 < size) output[index] = Math.min(output[index], output[index + size] + 1);
    }
  }
  return output;
}
