import { createHash } from "node:crypto";
import process from "node:process";

import { describe, expect, it } from "vitest";

import {
  codeNativeRestaurantRecipes,
  RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID,
} from "../packages/catalogue-authoring/src/code-native-art-recipes-restaurants.ts";
import { renderRestaurantMotifConstruction } from "../packages/catalogue-authoring/src/code-native-restaurant-motif-construction.ts";
import {
  measureMiniatureResidual,
  renderFlatRecipe,
  resizeRgbaBilinear,
} from "./code-native-art/flat-raster.mjs";

const EXACT_SIZE = 48;
const MINIMUM_SIBLING_DISTANCE = 0.045;
const MINIMUM_STYLE_RGB_DISTANCE = 0.03;
const MINIMUM_STYLE_CHANGED_PIXELS = 96;
const MINIMUM_MOTIF_VISIBLE_PIXELS = 8;
const MINIMUM_MOTIF_VISIBILITY_FRACTION = 0.15;
const GEOMETRY_DISTANCE_CAP = 6;
const signatures = [...new Set(Object.values(RESTAURANT_STYLE_SIGNATURE_BY_STYLE_ID))].sort();
const canonicalHex = ["#F5F1E8", "#152A30", "#D98245", "#568278", "#E0BC5B", "#76546D"];
const controlPalette = canonicalHex.slice(0, 4).map((hex, index) => ({ name: `control ${index}`, hex }));
const controlMotif = {
  label: "broad control oval",
  kind: "oval",
  count: 1,
  colorIndex: 2,
  x: 0.5,
  y: 0.5,
  width: 0.5,
  height: 0.36,
};
describe("restaurant code-native motif constructions", () => {
  it("derives fourteen visible treatments from the supplied motif instead of a full-canvas template", () => {
    expect(signatures).toHaveLength(14);
    const centeredHashes = new Set();
    const styleImages = new Map();
    const styleStructures = new Map();
    for (const signature of signatures) {
      const centered = renderRestaurantMotifConstruction(signature, controlMotif, controlPalette.length);
      const moved = renderRestaurantMotifConstruction(
        signature,
        { ...controlMotif, x: 0.3, y: 0.68, width: 0.34, height: 0.24 },
        controlPalette.length,
      );
      expect(centered, signature).toHaveLength(2);
      expect(renderHash(centered), signature).not.toBe(renderHash(moved));
      const bounds = commandBounds(centered);
      expect(bounds.minX, signature).toBeGreaterThan(80);
      expect(bounds.minY, signature).toBeGreaterThan(80);
      expect(bounds.maxX, signature).toBeLessThan(816);
      expect(bounds.maxY, signature).toBeLessThan(816);
      centeredHashes.add(renderHash(centered));
      const recipe = {
        slug: `style-${signature}`,
        palette: controlPalette,
        backgroundColor: 0,
        commands: centered,
      };
      styleImages.set(signature, resizeRgbaBilinear(renderFlatRecipe(recipe), EXACT_SIZE));
      styleStructures.set(signature, exact48VisiblePartition(recipe));
    }
    expect(centeredHashes.size).toBe(signatures.length);
    const rgbPairs = imagePairs(styleImages).sort((left, right) => left.distance - right.distance);
    const structurePairs = allPairs(styleStructures).sort((left, right) => left.distance - right.distance);
    const diagnostic = rgbPairs
      .slice(0, 8)
      .map(
        ({ left, right, distance, changedPixels }) =>
          `${left}/${right}: ${distance.toFixed(6)} (${changedPixels} changed pixels)`,
      )
      .join("\n");
    expect(rgbPairs).toHaveLength((14 * 13) / 2);
    expect(rgbPairs[0].distance, diagnostic).toBeGreaterThanOrEqual(MINIMUM_STYLE_RGB_DISTANCE);
    expect(
      [...rgbPairs].sort((left, right) => left.changedPixels - right.changedPixels)[0].changedPixels,
      diagnostic,
    ).toBeGreaterThanOrEqual(MINIMUM_STYLE_CHANGED_PIXELS);
    expect(structurePairs[0].distance, diagnostic).toBeGreaterThanOrEqual(MINIMUM_SIBLING_DISTANCE);
    process.stdout.write(
      `\nExact-48 style gate: 14 treatments, RGB nearest ${diagnostic.replaceAll("\n", "; ")}; categorical nearest ${structurePairs[0].left}/${structurePairs[0].right} ${structurePairs[0].distance.toFixed(6)}.\n`,
    );
  }, 60_000);

  it("keeps every raw 896 render within the exact-48 miniature residual limit", () => {
    expect(codeNativeRestaurantRecipes).toHaveLength(132);
    const measurements = codeNativeRestaurantRecipes.map((recipe) => ({
      slug: recipe.slug,
      residual: measureMiniatureResidual(renderFlatRecipe(recipe), EXACT_SIZE),
    }));
    const failures = measurements.filter(({ residual }) => residual > 0.045);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  }, 60_000);

  it("keeps every researched motif instance visibly present in the exact-48 result", () => {
    const failures = [];
    for (const recipe of codeNativeRestaurantRecipes) {
      expect(recipe.commands.length % 2, recipe.slug).toBe(0);
      const complete = resizeRgbaBilinear(renderFlatRecipe(recipe), EXACT_SIZE);
      const blank = resizeRgbaBilinear(renderFlatRecipe({ ...recipe, commands: [] }), EXACT_SIZE);
      for (let index = 0; index < recipe.commands.length; index += 2) {
        const withoutMotif = resizeRgbaBilinear(
          renderFlatRecipe({
            ...recipe,
            commands: [...recipe.commands.slice(0, index), ...recipe.commands.slice(index + 2)],
          }),
          EXACT_SIZE,
        );
        const standaloneMotif = resizeRgbaBilinear(
          renderFlatRecipe({ ...recipe, commands: recipe.commands.slice(index, index + 2) }),
          EXACT_SIZE,
        );
        const changedPixels = countDifferentPixels(complete.data, withoutMotif.data);
        const standalonePixels = countDifferentPixels(standaloneMotif.data, blank.data);
        const visibleFraction = changedPixels / standalonePixels;
        if (
          changedPixels < MINIMUM_MOTIF_VISIBLE_PIXELS ||
          visibleFraction < MINIMUM_MOTIF_VISIBILITY_FRACTION
        ) {
          failures.push({
            slug: recipe.slug,
            motifInstance: index / 2 + 1,
            changedPixels,
            standalonePixels,
            visibleFraction,
          });
        }
      }
    }
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  }, 60_000);

  it("rejects a motif whose standalone footprint is mostly covered", () => {
    const recipe = visibilityControlRecipe();
    const complete = resizeRgbaBilinear(renderFlatRecipe(recipe), EXACT_SIZE);
    const blank = resizeRgbaBilinear(renderFlatRecipe({ ...recipe, commands: [] }), EXACT_SIZE);
    const withoutMotif = resizeRgbaBilinear(
      renderFlatRecipe({ ...recipe, commands: recipe.commands.slice(2) }),
      EXACT_SIZE,
    );
    const standaloneMotif = resizeRgbaBilinear(
      renderFlatRecipe({ ...recipe, commands: recipe.commands.slice(0, 2) }),
      EXACT_SIZE,
    );
    const changedPixels = countDifferentPixels(complete.data, withoutMotif.data);
    const standalonePixels = countDifferentPixels(standaloneMotif.data, blank.data);
    const visibleFraction = changedPixels / standalonePixels;
    expect(changedPixels).toBeGreaterThanOrEqual(MINIMUM_MOTIF_VISIBLE_PIXELS);
    expect(visibleFraction).toBeLessThan(MINIMUM_MOTIF_VISIBILITY_FRACTION);
  });
});

function renderHash(commands) {
  const image = resizeRgbaBilinear(
    renderFlatRecipe({
      slug: "motif-construction-control",
      palette: controlPalette,
      backgroundColor: 0,
      commands,
    }),
    EXACT_SIZE,
  );
  return createHash("sha256").update(image.data).digest("hex");
}

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

function imagePairs(images) {
  const entries = [...images.entries()];
  const pairs = [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      let difference = 0;
      let changedPixels = 0;
      const left = entries[leftIndex][1].data;
      const right = entries[rightIndex][1].data;
      for (let index = 0; index < left.length; index += 4) {
        const pixelDifference =
          Math.abs(left[index] - right[index]) +
          Math.abs(left[index + 1] - right[index + 1]) +
          Math.abs(left[index + 2] - right[index + 2]);
        difference += pixelDifference;
        if (pixelDifference > 0) changedPixels += 1;
      }
      pairs.push({
        left: entries[leftIndex][0],
        right: entries[rightIndex][0],
        distance: difference / (EXACT_SIZE * EXACT_SIZE * 3 * 255),
        changedPixels,
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

function visibilityControlRecipe() {
  return {
    slug: "motif-visibility-control",
    palette: controlPalette,
    backgroundColor: 0,
    commands: [
      { kind: "rect", color: 1, x: 100, y: 100, width: 696, height: 696 },
      { kind: "rect", color: 2, x: 120, y: 120, width: 656, height: 656 },
      { kind: "rect", color: 3, x: 100, y: 100, width: 620, height: 696 },
      { kind: "rect", color: 3, x: 100, y: 100, width: 620, height: 696 },
    ],
  };
}

function countDifferentPixels(left, right) {
  let count = 0;
  for (let index = 0; index < left.length; index += 4) {
    if (
      left[index] !== right[index] ||
      left[index + 1] !== right[index + 1] ||
      left[index + 2] !== right[index + 2]
    ) {
      count += 1;
    }
  }
  return count;
}

function commandBounds(commands) {
  const points = commands.flatMap(commandPoints);
  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
}

function commandPoints(command) {
  if (command.kind === "rect") {
    return [
      [command.x, command.y],
      [command.x + command.width, command.y + command.height],
    ];
  }
  if (command.kind === "circle") {
    return [
      [command.cx - command.radius, command.cy - command.radius],
      [command.cx + command.radius, command.cy + command.radius],
    ];
  }
  if (command.kind === "ellipse") {
    return [
      [command.cx - command.radiusX, command.cy - command.radiusY],
      [command.cx + command.radiusX, command.cy + command.radiusY],
    ];
  }
  if (command.kind === "arc") {
    return [
      [command.cx - command.outerRadius, command.cy - command.outerRadius],
      [command.cx + command.outerRadius, command.cy + command.outerRadius],
    ];
  }
  if (command.kind === "curve") {
    const radius = command.width / 2;
    return command.points.flatMap(([x, y]) => [
      [x - radius, y - radius],
      [x + radius, y + radius],
    ]);
  }
  if (command.kind === "polygon") return command.points;
  return [
    [command.cx - command.outerRadius, command.cy - command.outerRadius],
    [command.cx + command.outerRadius, command.cy + command.outerRadius],
  ];
}
