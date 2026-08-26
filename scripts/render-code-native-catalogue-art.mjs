import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createServer } from "vite";

import {
  measureMiniatureResidual,
  renderFlatRecipe,
  resizeRgbaBilinear,
} from "./code-native-art/flat-raster.mjs";
import { encodeRgbPng } from "./code-native-art/png.mjs";

const SOURCE_SIZE = 896;
const PROOF_SIZE = 48;
const args = parseArguments(process.argv.slice(2));
const outputRoot = path.resolve(args.output ?? "output/code-native-catalogue-art");
const server = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const module = await server.ssrLoadModule("/packages/catalogue-authoring/src/code-native-art-recipes.ts");
  const requested = new Set(args.slugs);
  const recipes = module.codeNativeArtRecipes.filter(
    (recipe) =>
      (requested.size === 0 || requested.has(recipe.slug)) &&
      (args.directory === undefined || recipe.catalogueDirectory === args.directory),
  );
  const missing = [...requested].filter(
    (slug) => !module.codeNativeArtRecipes.some((recipe) => recipe.slug === slug),
  );
  if (missing.length > 0) {
    throw new Error(
      `Unknown code-native recipe slug(s): ${missing.join(", ")}; use an exact registered slug.`,
    );
  }
  if (
    args.directory !== undefined &&
    !module.codeNativeArtRecipes.some((recipe) => recipe.catalogueDirectory === args.directory)
  ) {
    throw new Error(
      `Unknown code-native catalogue directory ${JSON.stringify(args.directory)}; use a directory represented by registered recipes.`,
    );
  }

  const report = [];
  for (const recipe of recipes) {
    const source = renderFlatRecipe(recipe, SOURCE_SIZE);
    const proof = resizeRgbaBilinear(source, PROOF_SIZE);
    const sourceBytes = encodeRgbPng(source);
    const proofBytes = encodeRgbPng(proof);
    const sourceDirectory = path.join(outputRoot, "sources", recipe.catalogueDirectory);
    const proofDirectory = path.join(outputRoot, "proofs", recipe.catalogueDirectory);
    await Promise.all([
      mkdir(sourceDirectory, { recursive: true }),
      mkdir(proofDirectory, { recursive: true }),
    ]);
    const sourcePath = path.join(sourceDirectory, `${recipe.slug}.png`);
    const proofPath = path.join(proofDirectory, `${recipe.slug}-48.png`);
    await Promise.all([writeFile(sourcePath, sourceBytes), writeFile(proofPath, proofBytes)]);

    const miniatureResidual = measureMiniatureResidual(source, PROOF_SIZE);
    const distinctSourceRgb = new Set(
      Array.from(
        { length: source.width * source.height },
        (_, index) => `${source.data[index * 4]},${source.data[index * 4 + 1]},${source.data[index * 4 + 2]}`,
      ),
    ).size;
    report.push({
      catalogueDirectory: recipe.catalogueDirectory,
      slug: recipe.slug,
      renderer: recipe.renderer,
      recipeSha256: sha256(module.serializeCodeNativeArtRecipe(recipe)),
      sourcePath: path.relative(process.cwd(), sourcePath).replaceAll("\\", "/"),
      sourceSha256: sha256(sourceBytes),
      sourceBytes: sourceBytes.byteLength,
      sourceSize: [SOURCE_SIZE, SOURCE_SIZE],
      sourcePngColorType: "RGB",
      proofPath: path.relative(process.cwd(), proofPath).replaceAll("\\", "/"),
      proofSha256: sha256(proofBytes),
      proofSize: [PROOF_SIZE, PROOF_SIZE],
      miniatureResidual,
      quantitativePass: miniatureResidual <= 0.045,
      palette: recipe.palette,
      paletteColors: recipe.palette.length,
      distinctSourceRgb,
      minimumFeaturePixels: recipe.minimumFeaturePixels,
      minimumNegativeGapPixels: recipe.minimumNegativeGapPixels,
      manufacturingLanguage: recipe.manufacturingLanguage,
      primaryStyleId: recipe.primaryStyleId,
      styleComparison: recipe.styleComparison,
      forms: recipe.forms,
      relationship: recipe.relationship,
      edgeStrategy: recipe.edgeStrategy,
      safeguards: recipe.safeguards,
      sourceSpecificExclusions: recipe.sourceSpecificExclusions,
    });
  }
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "png-metrics.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ outputRoot, rendered: report.length, failures: report.filter(({ quantitativePass }) => !quantitativePass).map(({ slug }) => slug) })}\n`,
  );
} finally {
  await server.close();
}

function parseArguments(values) {
  const parsed = { output: undefined, slugs: [], directory: undefined };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--output") {
      parsed.output = values[index + 1];
      index += 1;
    } else if (value === "--slug") {
      parsed.slugs.push(values[index + 1]);
      index += 1;
    } else if (value === "--directory") {
      parsed.directory = values[index + 1];
      index += 1;
    } else {
      throw new Error(
        `Unknown code-native renderer argument ${JSON.stringify(value)}; use --output <directory>, --directory <catalogue-directory>, or --slug <registered-slug>.`,
      );
    }
  }
  return parsed;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
