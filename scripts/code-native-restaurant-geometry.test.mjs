import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import process from "node:process";

import { describe, expect, it } from "vitest";

import { codeNativeRestaurantRecipes } from "../packages/catalogue-authoring/src/code-native-art-recipes-restaurants.ts";
import { renderFlatRecipe, resizeRgbaBilinear } from "./code-native-art/flat-raster.mjs";

const EXACT_SIZE = 48;
const MINIMUM_SIBLING_DISTANCE = 0.045;
const GEOMETRY_DISTANCE_CAP = 6;
const canonicalHex = ["#F5F1E8", "#152A30", "#D98245", "#568278", "#E0BC5B", "#76546D"];
const controlPalette = canonicalHex.slice(0, 4).map((hex, index) => ({ name: `control ${index}`, hex }));
const formerTemplateSiblings = [
  ["press", "the-village-pub"],
  ["enclos", "selbys"],
  ["plumed-horse", "the-french-laundry"],
  ["cyrus", "protege"],
];

describe("restaurant code-native geometry signatures", () => {
  it("rejects exact-48 structural siblings with a color-label-independent geometry gate", () => {
    const structures = new Map(
      codeNativeRestaurantRecipes.map((recipe) => [recipe.slug, exact48VisiblePartition(recipe)]),
    );
    const paletteControl = codeNativeRestaurantRecipes[0];
    const changedPalette = {
      ...paletteControl,
      palette: paletteControl.palette.map((entry, index) => ({
        ...entry,
        hex: canonicalHex[(index + 3) % canonicalHex.length],
      })),
    };
    expect(changedPalette.palette.map(({ hex }) => hex)).not.toEqual(
      paletteControl.palette.map(({ hex }) => hex),
    );
    const controlStructure = exact48VisiblePartition(paletteControl);
    const relabeledStructure = exact48VisiblePartition(changedPalette);
    expect(structureHash(controlStructure)).toBe(structureHash(relabeledStructure));
    const relabelDistance = structureDistance(controlStructure, relabeledStructure);
    expect(relabelDistance.distance).toBe(0);
    expect(relabelDistance.distance).toBeLessThan(MINIMUM_SIBLING_DISTANCE);

    const permutedPalette = consistentPalettePermutation(paletteControl);
    expect(Buffer.from(renderExact48(paletteControl).data)).toEqual(
      Buffer.from(renderExact48(permutedPalette).data),
    );
    expect(structureDistance(controlStructure, exact48VisiblePartition(permutedPalette)).distance).toBe(0);
    const permutationFailures = codeNativeRestaurantRecipes
      .map((recipe) => ({
        slug: recipe.slug,
        distance: structureDistance(
          exact48VisiblePartition(recipe),
          exact48VisiblePartition(consistentPalettePermutation(recipe)),
        ).distance,
      }))
      .filter(({ distance }) => distance !== 0);
    expect(permutationFailures, JSON.stringify(permutationFailures, null, 2)).toEqual([]);

    const singleRegion = sameColorPartitionControlRecipe(false);
    const partitionedRegion = sameColorPartitionControlRecipe(true);
    const singleRaster = resizeRgbaBilinear(renderFlatRecipe(singleRegion), EXACT_SIZE);
    const partitionedRaster = resizeRgbaBilinear(renderFlatRecipe(partitionedRegion), EXACT_SIZE);
    expect(Buffer.from(singleRaster.data)).toEqual(Buffer.from(partitionedRaster.data));
    const partitionDistance = structureDistance(
      exact48VisiblePartition(singleRegion),
      exact48VisiblePartition(partitionedRegion),
    );
    expect(partitionDistance.distance).toBe(0);

    const occlusionRecipe = occlusionControlRecipe(false);
    const occlusionControl = exact48VisiblePartition(occlusionRecipe);
    const reversedOcclusion = exact48VisiblePartition(occlusionControlRecipe(true));
    const occlusionDistance = structureDistance(occlusionControl, reversedOcclusion);
    expect(structureHash(occlusionControl)).not.toBe(structureHash(reversedOcclusion));
    expect(occlusionDistance.silhouette).toBe(0);
    expect(occlusionDistance.distance).toBeGreaterThanOrEqual(MINIMUM_SIBLING_DISTANCE);
    const mergedColor = {
      ...occlusionRecipe,
      slug: "occlusion-merged-color",
      commands: occlusionRecipe.commands.map((command) => ({ ...command, color: 1 })),
    };
    expect(
      structureDistance(occlusionControl, exact48VisiblePartition(mergedColor)).distance,
    ).toBeGreaterThanOrEqual(MINIMUM_SIBLING_DISTANCE);

    const nearestPairs = allPairs(structures).sort((left, right) => left.distance - right.distance);
    expect(structures.size).toBe(132);
    expect(nearestPairs).toHaveLength((132 * 131) / 2);
    const diagnostic = nearestPairs
      .slice(0, 12)
      .map(
        ({ left, right, distance, boundary, silhouette }) =>
          `${left}/${right}: ${distance.toFixed(6)} (boundary ${boundary.toFixed(6)}, silhouette ${silhouette.toFixed(6)})`,
      )
      .join("\n");
    process.stdout.write(
      `\nExact-48 geometry gate: 132 recipes, ${nearestPairs.length} pairs, nearest ${diagnostic.replaceAll("\n", "; ")}; occlusion control ${occlusionDistance.distance.toFixed(6)}.\n`,
    );
    expect(nearestPairs[0].distance, diagnostic).toBeGreaterThanOrEqual(MINIMUM_SIBLING_DISTANCE);
    for (const [left, right] of formerTemplateSiblings) {
      const measured = structureDistance(structures.get(left), structures.get(right));
      expect(measured.distance, `${left}/${right}\n${diagnostic}`).toBeGreaterThanOrEqual(
        MINIMUM_SIBLING_DISTANCE,
      );
    }
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
      const measured = structureDistance(entries[leftIndex][1], entries[rightIndex][1]);
      pairs.push({ left: entries[leftIndex][0], right: entries[rightIndex][0], ...measured });
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
    .update(Buffer.from(structure.partition.buffer))
    .update(Buffer.from(structure.boundary.buffer))
    .update(Buffer.from(structure.silhouette.buffer))
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

function occlusionControlRecipe(reverse) {
  const commands = [
    { kind: "circle", color: 1, cx: 448, cy: 448, radius: 310 },
    { kind: "rect", color: 2, x: 292, y: 292, width: 312, height: 312 },
  ];
  return {
    slug: "occlusion-control",
    palette: controlPalette,
    backgroundColor: 0,
    commands: reverse ? commands.reverse() : commands,
  };
}

function consistentPalettePermutation(recipe) {
  const permutation = Array.from(
    { length: recipe.palette.length },
    (_, index) => (index + 2) % recipe.palette.length,
  );
  const palette = Array.from({ length: recipe.palette.length });
  recipe.palette.forEach((entry, index) => {
    palette[permutation[index]] = { name: `permuted ${index}`, hex: entry.hex };
  });
  return {
    ...recipe,
    backgroundColor: permutation[recipe.backgroundColor],
    palette,
    commands: recipe.commands.map((command) => ({
      ...command,
      color: permutation[command.color],
    })),
  };
}

function renderExact48(recipe) {
  return resizeRgbaBilinear(renderFlatRecipe(recipe), EXACT_SIZE);
}

function sameColorPartitionControlRecipe(partitioned) {
  const x = 112;
  const y = 168;
  const width = 672;
  const height = 560;
  const commands = partitioned
    ? Array.from({ length: 6 }, (_, index) => ({
        kind: "rect",
        color: 1,
        x: x + index * (width / 6),
        y,
        width: width / 6,
        height,
      }))
    : [{ kind: "rect", color: 1, x, y, width, height }];
  return {
    slug: "same-color-partition-control",
    palette: controlPalette,
    backgroundColor: 0,
    commands,
  };
}
