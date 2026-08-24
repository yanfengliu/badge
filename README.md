# Badge

Badge is a private, local-first achievement archive for remembering meaningful things, feeling proud of them, and staying curious about what to do next.

It combines the collectibility of national-park stamps and physical badges with the memory value of a personal journal, without points, competition, external verification, or noisy game mechanics.

The repository now contains a runnable first vertical slice with separately built Badge Archive and Badge Studio applications served as one local website, shared strict contracts, browser-local persistence, explicit live Claude Code saying proposals, deterministic fixture art, pack compilation and admission, and an interactive 3D renderer with a static fallback.

## Run locally

Install Node 24, then from the repository root run:

```powershell
npm install
npm start
```

Open the exact site address printed by the launcher. Archive is at `/` and Badge Studio is at `/studio/` on that same address. Badge prefers `http://127.0.0.1:4173`; if other software already owns it on the first recorded launch, Badge selects one free non-reserved port beginning at `4180` and remembers it in the ignored `.badge-local/site.json` machine-local file.

`npm start` probes both route identities every time. If the complete Badge site is already running, it prints the Archive and Studio URLs and exits successfully instead of starting a duplicate. Otherwise it owns one local listener in the terminal; press `Ctrl+C` once to stop it.

Do not delete or hand-edit `.badge-local/site.json` after using the app. IndexedDB belongs to the full browser origin, including the port, so Badge reuses the remembered site and refuses to jump away if another process later takes that port. Stop that process and run `npm start` again. Archive can relocate through its explicit backup and restore flow; Studio project backup is not implemented yet, so do not move an origin that contains Studio work you need.

Archive and Studio use different versioned IndexedDB databases on the same strict localhost origin and remain separate application and backup surfaces. Archive backups download as `.badgearchive` and include the exact fully decoded and validated source bytes for every earned visual in this slice; restore preserves historical semantics and visuals only within the same qualified definition and pack lineage. Source-only repair never replaces readable compatible personal state; a separate recovery mode may quarantine and replace readable state this version cannot present, but only after offering a self-contained safety backup and receiving a second explicit saved-copy confirmation. If damaged historical art prevents that backup, Archive instead offers a clearly non-restorable `.badgeevidence.json` state rescue before the same explicit confirmation. Both formats contain personal data and stay outside Git. Studio uploads, candidates, derivatives, and drafts remain browser-local and outside Git.

Startup verifies the tracked compact developer artwork, derives strict PNG runtime sources, and reproducibly compiles an ignored canonical starter `.badgepack` plus its exact `.badgetheme` dependency. Publishing the Yosemite Studio fixture likewise offers both files only after closed-object, decoded-memory, exact dependency-graph, and fallback-template checks; neither a loose sidecar nor a merely claimed theme identity is treated as a valid release.

Use `npm run verify` for the executable TypeScript, lint, unit, build, boundary, documentation, formatting, and dependency gates. Browser-flow and visual verification remain explicit checks for visual changes.

This is a foundation slice rather than the complete roadmap: live Studio art-provider calls, Archive pack installation and seen-release ledger, complete installed-pack backup closure, Studio project backups and durable release history, custom `.badgebrief` handoff UI, computed all-parks completion, repeat-occurrence authoring, and sharing are not implemented yet. The generated pack fixtures prove exact bytes and dependency closure; they do not imply an Archive install UI or a durable Studio release ledger.

## Product direction

- One local user in the first version, with no account or server required.
- Git-tracked application code, curated catalogue source, computed-goal rules, Studio prompt templates, published renderer manifests, and small pack registry records.
- Private local activations, dates, notes, sayings, visibility choices, installed badge packs, and backups.
- Planned and earned badges, prebuilt collections, custom achievements, and automatically completed collection-level goals.
- An earned-memory timeline ordered by when achievements happened, with a recipe-rendered preview of each exact pinned badge, one on-demand live 3D inspector, and direct reopening of the exact Archive memory; repeat occurrences remain a later product decision.
- An everyday archive that shows only published badge designs whose picture, shape, material, border, and 3D recipe are already decided.
- A separate developer-only Badge Studio for multi-candidate art generation, uploads, non-destructive reprocessing, 3D construction, selection, validation, and pack publishing.
- A real-time 3D badge viewer with dynamic material lighting, mouse rotation, bounded zoom, and direct light adjustment so each artifact can be examined like a physical object.
- Independent badge-saying authoring: generate a new compact paragraph or select a source-checked historical quotation, accept a proposal explicitly, or write the text directly without changing the badge art.
- A quiet, elegant gallery with tactile, beautifully made badge art and a sharp, restrained activation ceremony.

## Start here

- [Documentation index](docs/README.md)
- [Product vision](docs/design/vision.md)
- [Product specification](docs/design/product-spec.md)
- [Selected visual direction](docs/design/visual-direction.md)
- [Target architecture](docs/architecture/ARCHITECTURE.md)
- [Roadmap](docs/design/roadmap.md)

Implementation work must begin with [AGENTS.md](AGENTS.md) and the linked local policy.
