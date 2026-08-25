# Badge

Badge is a private, local-first achievement archive for remembering meaningful things, feeling proud of them, and staying curious about what to do next.

It combines the collectibility of national-park stamps and physical badges with the memory value of a personal journal, without points, competition, external verification, or noisy game mechanics.

The repository now contains a runnable first vertical slice in which one root-document host composes the Badge Archive and Badge Studio surfaces while standalone isolation builds preserve their source boundary, alongside shared strict contracts, separate browser-local persistence, a searchable Archive Discover catalogue for all `116` unique visualized badge concepts, preselected historical quotations with explicit live Claude Code regeneration, deterministic fixture art, pack compilation and admission, and an interactive 3D renderer with a static fallback.

## Run locally

Install Node 24, then from the repository root run:

```powershell
npm install
npm start
```

Open the exact site address printed by the launcher. Badge has one document at `/`; Collection is the default section, while Timeline, Discover, and Badge Studio use `#timeline`, `#discover`, and `#studio` view-state hashes on that root document. Legacy Studio document URLs under `/studio` redirect to `/#studio`. Badge prefers `http://127.0.0.1:4173`; if other software already owns it on the first recorded launch, Badge selects one free non-reserved port beginning at `4180` and remembers it in the ignored `.badge-local/site.json` machine-local file.

`npm start` verifies the versioned unified Badge marker and root mount at `/`, its single supported same-origin live or built host module, and the canonical `/studio` redirect every time. If the complete current Badge site is already running, it prints the one site address and exits successfully instead of starting a duplicate; a marker-only, missing-root, broken-entry, external-entry, hybrid route-split, or older Badge listener is refused rather than reused as the current host. Otherwise it owns one local listener in the terminal; press `Ctrl+C` once to stop it.

Do not delete or hand-edit `.badge-local/site.json` after using the app. IndexedDB belongs to the full browser origin, including the port, so Badge reuses the remembered site and refuses to jump away if another process later takes that port. Stop that process and run `npm start` again. Archive can relocate through its explicit backup and restore flow; Studio project backup is not implemented yet, so do not move an origin that contains Studio work you need.

Archive and Studio use different versioned IndexedDB databases, repositories, and backup formats on the same strict localhost origin even though one host document presents both sections. Archive backups download as `.badgearchive` and include the exact fully decoded and validated source bytes for every earned visual in this slice; restore preserves historical semantics and visuals only within the same qualified definition and pack lineage. Source-only repair never replaces readable compatible personal state; a separate recovery mode may quarantine and replace readable state this version cannot present, but only after offering a truthful safety handoff and receiving a second explicit saved-copy confirmation. When current readable state cannot be safely restored or represented by a complete restorable backup—for example because an earned memory has no sealed quotation or historical art is unreconstructable—Archive instead offers a clearly non-restorable `.badgeevidence.json` state rescue. Both formats contain personal data and stay outside Git. Studio uploads, candidates, derivatives, and drafts remain browser-local and outside Git.

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
- A read-only Discover catalogue for every tracked visualized badge concept: published entries reopen Collection, while selected park studies remain clearly non-actionable until publication.
- A separate developer-only Badge Studio for multi-candidate art generation, uploads, non-destructive reprocessing, 3D construction, selection, validation, and pack publishing.
- A real-time 3D badge viewer with dynamic material lighting, mouse rotation, bounded zoom, and direct light adjustment so each artifact can be examined like a physical object.
- Source-checked badge quotations: each of the four current starter badges starts with an attributed historical quote, and before activation one `Regenerate quote` action can select a different exact reviewed quotation without changing the badge art; the general installed-pack quotation bank remains roadmap work.
- A quiet, elegant gallery with tactile, beautifully made badge art and a sharp, restrained activation ceremony.

## Start here

- [Documentation index](docs/README.md)
- [Product vision](docs/design/vision.md)
- [Product specification](docs/design/product-spec.md)
- [Selected visual direction](docs/design/visual-direction.md)
- [Target architecture](docs/architecture/ARCHITECTURE.md)
- [Roadmap](docs/design/roadmap.md)

Implementation work must begin with [AGENTS.md](AGENTS.md) and the linked local policy.
