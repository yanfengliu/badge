# Personal data and Git

One of [Badge's local rules](../local-rules.md), with the reasons and evidence of each.

Git tracks product code, schemas, migrations, curated catalogue source, computed-goal rules, Studio prompt templates, published renderer manifests, optional small pack registry records, tests, and deliberately promoted small source assets.

Never commit activations, dates, notes, sayings, visibility choices, user-created private definitions, Studio uploads, ordinary generated candidates, selected personal artwork, backups, provider credentials, account selectors, session details, or logs containing personal prompts or memories.

New definitions created in the archive and their issued authoring requests remain local and outside browse, plan, and activation flows until an explicitly imported Studio pack targets them with a published visual. Reusing another definition's installed presentation is not assumed until the open product decision permits it. Badge Studio may explicitly export only prepared immutable validated pack bytes; neither application mutates Git implicitly.

The sole Archive-to-Studio handoff is an explicitly previewed `.badgebrief` containing a random request ID, local definition ID, semantic revision, title, criterion, optional deliberately included description, schema version, and canonical digest. It contains no visual direction, prompt, owner identity, dates, occurrences, activation, notes, sayings, visibility, collection settings, assets, provider data, credentials, or database references. Editing the definition supersedes any active request and invalidates any current-revision visual binding; planned and earned records retain their pinned historical semantic revision and visual. Local `.badgebrief`, pack, and backup exports are ignored and rejected by the staged-delivery gate.

Generated and uploaded Studio media is heavyweight local data by default. Each published pack embeds its own content-addressed objects and may depend only on exact other self-contained packs; heavy pack files are distributed outside ordinary Git, while Git may track a small registry record. Git LFS or another store is not implied and requires an explicit decision and user approval.
