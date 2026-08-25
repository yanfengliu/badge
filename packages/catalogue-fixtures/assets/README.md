# Fixture artwork provenance

## Historical v1 source studies

These six text-free source artworks were created for the first runnable Badge fixture set with the built-in OpenAI image-generation tool on 2026-08-23, then visually inspected and converted from generated PNG originals to 896-pixel WebP assets under the ordinary Git binary ceiling.

The selected Yosemite literal, symbolic portal, and topographic journey variants intentionally exercise the Studio candidate comparison flow. The _Sapiens_, bachelor's-degree, and all-parks images provide distinct prepublished Archive fixtures rather than reusing an unrelated visual.

Prompts asked for original editorial engraving, topographic line discipline, warm restraint, and small mineral accents. Every prompt explicitly prohibited text, logos, finished badge silhouettes, rims, borders, bevels, thickness, cast shadows, object-level material lighting, coins, medallions, and copied reference compositions. The first degree result was rejected because it returned a circular finished-object silhouette; the retained revision removes that boundary and is full-bleed source art.

The 3D renderer—not these files—owns shape, border, thickness, relief, material, and inspection lighting.

The original `yosemite-literal.webp`, `yosemite-symbolic.webp`, `yosemite-topographic.webp`, `sapiens.webp`, `bachelors-degree.webp`, and `all-parks.webp` files remain tracked as historical v1 inputs. They are not relabeled as conforming to the later miniature-manufacturing standard and are no longer the current fixture faces.

## Manufacturing-reviewed v2 fixture edition

The six replacement faces were generated with the built-in OpenAI image-generation tool on 2026-08-25 through the recorded manual `fixture-image-edit-manual@1` correction workflow under the same `small-badge-face@1` limits used by compiled catalogue prompts, visually inspected at native size and as miniature proofs, and normalized deterministically to `896 × 896` WebP with `scripts/normalize-generated-fixture-art.mjs`. Their exact prompts and prompt hashes, candidate keys, input-reference and generated-master hashes, rights provenance, normalization settings, source hashes, byte sizes, manufacturing review counts, treatment identities, and `48 × 48` proof hashes are recorded in `packages/catalogue-fixtures/src/manufacturing.ts`.

- `yosemite-literal-manufactured-v2.webp` uses a stained-glass or cloisonne composition of El Capitan, a turquoise river, two or three pines, and the sun, constrained to six colors and no more than eight broad joined regions.
- `sapiens-embroidered-v2.webp` uses flat applique-like fields for four large human profiles, one path, and one rayless sun disk in six thread colors, without baked fiber texture, miniature people, cities, or book pages.
- `bachelors-degree-marquetry-v2.webp` uses wood marquetry for three monumental steps, one doorway, and the sun in five broad wood or color fields, without a cap, diploma, or tiny scenery.
- `all-parks-cut-paper-v2.webp` uses broad cut-paper shapes for a redwood, mountain, desert arch, wave, sun, and trail instead of a collage of miniature park scenes.
- `yosemite-symbolic-manufactured-v2.webp` uses ceramic-underglaze fields for a granite portal framing Half Dome, the river, and the sun.
- `yosemite-topographic-manufactured-v2.webp` uses relief-print or screenprint language for five broad land bands, Half Dome, the river, and one rust-colored trail rather than dense contour lines.

Every v2 prompt prohibited typography, logos, microdetail, tiny repeated scenery, gradients used as a substitute for structure, and any finished badge, patch, coin, rim, bevel, thickness, cast shadow, or presentation mockup. The shared `badge-source-art@2` contract further requires a `32 mm` and `48 × 48` proof, `3–5` primary forms, no more than `3` accents and `6` color families, a minimum recognition-critical form or mark of `1 mm`, a minimum essential gap of `0.8 mm`, and a treatment-specific floor for noncritical construction lines. These raster sources are appearance-screened inputs, not certified manufacturing files; a selected vendor must still preflight and adapt final production artwork.

The four Archive-published v2 images are deterministically decoded into lossless filter-0 RGBA PNG derivatives under ignored `tmp/generated/archive-fixtures/` before Archive start, development, or build. Fixed source and derivative hashes make this reproducible; the heavyweight PNGs are build artifacts and must not enter Git. Studio uses the three compact tracked Yosemite v2 WebP inputs directly and publishes selected pixels as validated PNG.
