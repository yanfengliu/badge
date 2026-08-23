# Badge

Badge is a private, local-first achievement archive for remembering meaningful things, feeling proud of them, and staying curious about what to do next.

It combines the collectibility of national-park stamps and physical badges with the memory value of a personal journal, without points, competition, external verification, or noisy game mechanics.

The repository now contains a runnable first vertical slice with separate Badge Archive and Badge Studio applications, shared strict contracts, browser-local persistence, deterministic fixture art, pack compilation and admission, and an interactive 3D renderer with a static fallback.

## Run locally

Install Node 24, then from the repository root run:

```powershell
npm install
npm start
```

Open the everyday [Badge Archive](http://127.0.0.1:4173) and the developer-only [Badge Studio](http://127.0.0.1:4174).

`npm start` owns both local servers in one terminal; press `Ctrl+C` once to stop them.

Archive and Studio use different IndexedDB databases on different strict localhost origins. Archive backups download as `.badgearchive` and include the exact fully decoded and validated source bytes for every earned visual in this slice; restore preserves historical semantics and visuals only within the same qualified definition and pack lineage. Source-only repair never replaces readable compatible personal state; a separate recovery mode may quarantine and replace readable state this version cannot present, but only after offering a self-contained safety backup and receiving a second explicit saved-copy confirmation. If damaged historical art prevents that backup, Archive instead offers a clearly non-restorable `.badgeevidence.json` state rescue before the same explicit confirmation. Both formats contain personal data and stay outside Git. Studio uploads, candidates, derivatives, and drafts remain browser-local and outside Git.

Startup verifies the tracked compact developer artwork, derives strict PNG runtime sources, and reproducibly compiles an ignored canonical starter `.badgepack` plus its exact `.badgetheme` dependency. Publishing the Yosemite Studio fixture likewise offers both files only after closed-object, decoded-memory, exact dependency-graph, and fallback-template checks; neither a loose sidecar nor a merely claimed theme identity is treated as a valid release.

Use `npm run verify` for the executable TypeScript, lint, unit, build, boundary, documentation, formatting, and dependency gates. Browser-flow and visual verification remain explicit checks for visual changes.

This is a foundation slice rather than the complete roadmap: live model-provider calls, Archive pack installation and seen-release ledger, complete installed-pack backup closure, Studio project backups and durable release history, custom `.badgebrief` handoff UI, computed all-parks completion, timeline, and sharing are not implemented yet. The generated pack fixtures prove exact bytes and dependency closure; they do not imply an Archive install UI or a durable Studio release ledger.

## Product direction

- One local user in the first version, with no account or server required.
- Git-tracked application code, curated catalogue source, computed-goal rules, Studio prompt templates, published renderer manifests, and small pack registry records.
- Private local activations, dates, notes, sayings, visibility choices, installed badge packs, and backups.
- Planned and earned badges, prebuilt collections, custom achievements, and automatically completed collection-level goals.
- An everyday archive that shows only published badge designs whose picture, shape, material, border, and 3D recipe are already decided.
- A separate developer-only Badge Studio for multi-candidate art generation, uploads, non-destructive reprocessing, 3D construction, selection, validation, and pack publishing.
- A real-time 3D badge viewer with dynamic material lighting, mouse rotation, bounded zoom, and direct light adjustment so each artifact can be examined like a physical object.
- Independent one-line saying authoring: generate or regenerate a proposal, accept it explicitly, or write the line directly without changing the badge art.
- A quiet, elegant gallery with tactile, beautifully made badge art and a sharp, restrained activation ceremony.

## Start here

- [Documentation index](docs/README.md)
- [Product vision](docs/design/vision.md)
- [Product specification](docs/design/product-spec.md)
- [Selected visual direction](docs/design/visual-direction.md)
- [Target architecture](docs/architecture/ARCHITECTURE.md)
- [Roadmap](docs/design/roadmap.md)

Implementation work must begin with [AGENTS.md](AGENTS.md) and the linked local policy.
