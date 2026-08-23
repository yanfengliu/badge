# Badge local policy

These repo-specific rules bind alongside the fleet constitution and make its boundaries concrete for Badge.

## Personal data and Git

Git tracks product code, schemas, migrations, achievement and collection catalogues, computed-goal rules, prompt recipes, tests, and deliberately promoted small design inputs.

Never commit activations, dates, notes, visibility choices, user-created private definitions, uploads, generated candidates, selected personal artwork, backups, provider credentials, account selectors, session details, or logs containing personal prompts or memories.

New badges created inside the app remain local unless a separate explicit action promotes a sanitized definition into the Git-tracked catalogue; the UI must not mutate the repository implicitly.

Generated and uploaded media is heavyweight local user data by default. Git LFS or another asset store is not implied and requires an explicit decision and user approval.

## Persistence and recovery

Persistence is schema-versioned, exportable, and migration-tested. Corrupt or unsupported data is preserved and reported with a recovery path; never treat an unreadable store as empty and overwrite it.

Backups live outside the repository and include the structured local state, uploaded originals, selected artwork, a versioned manifest, and checksums. Restore validates the complete archive before replacing healthy state.

Do not delete an original, selected asset, or backup merely because the current screen no longer references it. Candidate and cache cleanup must use explicit lifecycle rules and must never sweep broad shared output paths.

## Product integrity

The initial product is single-user and local-first. Accounts, cloud sync, public publishing, other-user browsing, proof systems, points, streaks, leaderboards, rarity tiers, and social reactions are out of scope unless the user explicitly promotes them.

Achievement activation rests on personal honesty. A model may suggest goals, sayings, and art, but it never decides that an achievement was earned.

The one-line saying remains directly editable and independent from the art. Regeneration creates a proposal and never overwrites an accepted or user-authored line until the user explicitly chooses the replacement.

Live saying generation discloses the provider and exact outbound fields before private badge text leaves the device. By default it sends only the badge title, criterion, and saying-specific direction; notes, dates, occurrences, accepted sayings, and unrelated draft fields are excluded.

Generated artwork is text-free. Preserve every uploaded source unchanged; crop, restyle, background removal, material treatment, and other processing create derived assets.

Shape, material, border color, border width, crop, and positioning remain editable structured properties rather than being baked irreversibly into the only copy of the art.

The badge itself is a real-time 3D artifact in authoring and detail views. Preserve source art separately, derive texture or relief maps non-destructively, and store an engine-neutral versioned render recipe rather than a flattened badge or renderer-specific scene data.

Mouse rotation, bounded zoom, responsive lighting, a separate light-adjustment control, keyboard equivalents, reset, reduced-motion behavior, and a clear GPU fallback are product requirements rather than optional polish.

Activation data commits before its ceremony begins. The ceremony is replayable or skippable, respects reduced motion, and never substitutes spectacle for persistence correctness.

## Visual quality

The selected product language is a quiet premium field archive with substantial crafted objects, exact typography, generous space, restrained color, and clean motion.

Avoid cartoon rendering, careless generated art, souvenir-shop kitsch, cheap gradients, glassmorphism, confetti, loot effects, excessive glow, fake rarity, cluttered dashboards, and typography embedded in generated images.

Do not fake the required object with CSS perspective on a flat image or bake highlights and shadows into the only authoritative preview. Material response must change as the object or key light moves.

Visual changes are not complete until the relevant full flow is exercised in a real browser and inspected at more than one desktop-like viewport, including loading, empty, error, keyboard, and reduced-motion states when applicable.
