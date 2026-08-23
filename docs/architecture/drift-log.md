# Architecture Drift Log

Record target-architecture changes before implementation and structural divergence between the documented target and implemented repository afterward, newest first.

| Date | Change | Documentation response |
| --- | --- | --- |
| 2026-08-22 | Review hardened the new cross-application boundary around custom definitions, pack identity, and truthful release handoff before implementation. | Added D-015 for canonical pack lineage and prepared exact-byte releases and D-016 for minimal revisioned `.badgebrief` requests; qualified entity references, made semantic edits invalidate only the new revision's visual while preserving historical records, expanded replay and recovery tests, and recorded no code drift yet. |
| 2026-08-22 | Before implementation, visual authoring moved out of the everyday Archive into a dedicated developer-only Badge Studio. | Recorded the owner mandate in D-013 and the provisional two-build, immutable-pack response in D-014; split origins, persistence, backups, generation, tests, and roadmap slices. D-014 supersedes D-007's single-package topology, and there is no code drift yet. |
| 2026-08-22 | Before implementation, badges changed from layered 2D presentations into interactive 3D artifacts. | Recorded the owner mandate in D-011 and the provisional architecture response in D-012; added render-recipe semantics, viewer state, adapters, GPU lifecycle and fallback contracts, and a gated Phase 0 spike. There is no code drift yet. |
| 2026-08-22 | Before implementation, the target gained a provider-neutral saying-generation port separate from art generation. | Added `SayingDraft`, non-destructive proposal acceptance, deterministic fixtures, and component-test contracts to `ARCHITECTURE.md`; there is no code drift yet. |
| 2026-08-22 | No implementation exists; the architecture is a target rather than a description of code. | D-014 now supersedes D-007's single-package topology; the first scaffold must implement D-014 or append a newer superseding decision and update `ARCHITECTURE.md`. |
