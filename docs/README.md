# Documentation

This index names the current source of truth for each kind of decision.

## Product and design

- [Vision](design/vision.md) owns the emotional goal, pillars, scope stance, and non-goals.
- [Product specification](design/product-spec.md) owns domain language, user flows, requirements, examples, and unresolved product decisions.
- [Visual direction](design/visual-direction.md) owns the chosen visual system, Archive and Badge Studio surfaces, the dated implemented-surface record, badge-art grammar, motion, accessibility, and promoted references.
- [Roadmap](design/roadmap.md) owns implementation order and phase acceptance criteria.

## Architecture and policy

- [Architecture](architecture/ARCHITECTURE.md) owns module boundaries, authority, persistence, media, generation, backup, and future migration.
- [Architectural decisions](architecture/decisions.md) is append-only; supersede old decisions instead of deleting them.
- [Architecture drift log](architecture/drift-log.md) records target-architecture changes before implementation and structural divergence between the target and code afterward.
- [Local rules](policies/local-rules.md) contains durable repo-specific constraints that bind alongside `AGENTS.md`.

## Project history and learning

- [Devlog summary](devlog/summary.md) is the dated history index; detailed entries live under `devlog/detailed/`.
- [Lessons](learning/lessons.md) is the short session-start index; [lesson evidence](learning/lessons-evidence.md) holds anchored war stories.
- [Defect register](learning/defect-register.md) records every user-reported defect and the gate that prevents its class.

Do not create a second current-state document for a subject already owned here; update the canonical file and record structural drift or a decision when required.
