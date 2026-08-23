# Fixture artwork provenance

These six text-free source artworks were created for the first runnable Badge fixture set with the built-in OpenAI image-generation tool on 2026-08-23, then visually inspected and converted from generated PNG originals to 896-pixel WebP assets under the ordinary Git binary ceiling.

The selected Yosemite literal, symbolic portal, and topographic journey variants intentionally exercise the Studio candidate comparison flow. The _Sapiens_, bachelor's-degree, and all-parks images provide distinct prepublished Archive fixtures rather than reusing an unrelated visual.

Prompts asked for original editorial engraving, topographic line discipline, warm restraint, and small mineral accents. Every prompt explicitly prohibited text, logos, finished badge silhouettes, rims, borders, bevels, thickness, cast shadows, object-level material lighting, coins, medallions, and copied reference compositions. The first degree result was rejected because it returned a circular finished-object silhouette; the retained revision removes that boundary and is full-bleed source art.

The 3D renderer—not these files—owns shape, border, thickness, relief, material, and inspection lighting.

The four Archive-published images are deterministically decoded into lossless filter-0 RGBA PNG derivatives under ignored `tmp/generated/archive-fixtures/` before Archive start, development, or build. Fixed source and derivative hashes make this reproducible; the heavyweight PNGs are build artifacts and must not enter Git. Studio continues to use the compact tracked WebP inputs directly and publishes its selected pixels as validated PNG.
