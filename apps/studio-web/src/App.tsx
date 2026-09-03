import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { BadgeViewer } from "@badge/renderer-web";
import {
  firstTagProblem,
  type StudioAdjustmentHandler,
  type StudioAppearance,
  type StudioBadgeTarget,
} from "@badge/studio-adjustment-contract";

import { uploadedCandidateIdentity } from "./candidate-identity";
import { normalizeStudioAssetForPublication, readImageAsset } from "./image-processing";
import { StudioAppearancePanel } from "./StudioAppearancePanel";
import { StudioHeader } from "./StudioHeader";
import { StudioImagePanel } from "./StudioImagePanel";
import { StudioCollectionsPanel, StudioQuotePanel, StudioTagsPanel } from "./StudioMetadataPanels";
import {
  catalogueDefaultDraft,
  draftPreviewRecipe,
  draftPreviewUrl,
  initialStudioDraft,
  isCatalogueDefaultDraft,
  isStudioDraftDirty,
  studioTargetSignature,
  toStudioSubmission,
  usesOwnImage,
  withoutTag,
  withToggledCollection,
  withToggledTag,
  type StudioDraft,
} from "./studio-adjust-state";
import { useStudioLeaveGuard, type StudioLeaveGuard } from "./studio-leave-guard";
import { openStudioStore, StudioStoreError, type StudioStore } from "./studio-store";

export interface StudioAppProps {
  /** The badge the owner opened from Discover. Studio has nothing to show without one. */
  readonly target: StudioBadgeTarget | null;
  readonly onApply: StudioAdjustmentHandler;
  readonly onClose: () => void;
  readonly onLeaveGuardChange: (guard: StudioLeaveGuard | null) => void;
}

const OPENING_STATUS = "Adjust this badge, then save it back to your archive.";

export function App({ target, onApply, onClose, onLeaveGuardChange }: StudioAppProps) {
  const [draft, setDraft] = useState<StudioDraft | null>(() => (target ? initialStudioDraft(target) : null));
  const [status, setStatus] = useState(OPENING_STATUS);
  const [tagProblem, setTagProblem] = useState<string | null>(null);
  const [readingImage, setReadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const ownedUrls = useRef(new Set<string>());
  const store = useRef<StudioStore | null>(null);
  const openedSignature = useRef<string | null>(target ? studioTargetSignature(target) : null);

  // Re-sync on the badge's values, not merely its id. A save refreshes the target, and a draft
  // that survived it would keep a saved image "pending" — leaving the surface permanently unsaved
  // and refusing to let the owner leave — and would carry stale values back over an Archive-side
  // change on the next save.
  useEffect(() => {
    if (!target) return;
    const signature = studioTargetSignature(target);
    if (openedSignature.current === signature && draft !== null) return;
    const resumed = openedSignature.current === null;
    openedSignature.current = signature;
    setDraft(initialStudioDraft(target));
    setTagProblem(null);
    setStatus((current) => (resumed || current === OPENING_STATUS ? OPENING_STATUS : current));
  }, [draft, target]);

  useEffect(() => {
    let cancelled = false;
    const urls = ownedUrls.current;
    void openStudioStore({
      onConnectionIssue(error) {
        if (!cancelled) setStatus(error.message);
      },
    }).then(
      (opened) => {
        if (cancelled) return opened.close();
        store.current = opened;
      },
      (error: unknown) => {
        if (!cancelled) setStatus(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      cancelled = true;
      store.current?.close();
      store.current = null;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const dirty = draft !== null && target !== null && isStudioDraftDirty(draft, target);
  const leaving = useStudioLeaveGuard({
    dirty,
    busy: readingImage || saving,
    onBlocked: setStatus,
    onGuardChange: onLeaveGuardChange,
  });
  const busy = readingImage || saving || leaving;
  const faceSealed = target?.collected ?? false;
  const faceDisabled = busy || faceSealed;

  const updateAppearance = useCallback((patch: Partial<StudioAppearance>) => {
    setDraft((current) =>
      current ? { ...current, appearance: { ...current.appearance, ...patch } } : current,
    );
  }, []);

  const previewUrl = useMemo(
    () => (draft && target ? draftPreviewUrl(draft, target) : null),
    [draft, target],
  );
  const previewRecipe = useMemo(
    () => (draft && target ? draftPreviewRecipe(draft, target) : null),
    [draft, target],
  );

  async function pickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !target || busy || faceSealed) return;
    setReadingImage(true);
    try {
      const original = await readImageAsset(file);
      try {
        await store.current?.saveOriginal(original.blob, uploadedCandidateIdentity(original.hash));
      } catch (error) {
        // Keeping the untouched original is a promise Badge makes, so a storage failure is
        // reported rather than swallowed — but it must not lose the picture the owner just chose.
        setStatus(
          `${file.name} could not be filed as an unchanged original (${error instanceof StudioStoreError ? error.message : String(error)}). It is still ready to save onto this badge.`,
        );
      }
      const publication = await normalizeStudioAssetForPublication(original.blob);
      const previewObjectUrl = URL.createObjectURL(publication.blob);
      ownedUrls.current.add(previewObjectUrl);
      setDraft((current) =>
        current
          ? {
              ...current,
              useCatalogueImage: false,
              pendingImage: {
                hash: publication.hash,
                mimeType: publication.mimeType === "image/jpeg" ? "image/jpeg" : "image/png",
                bytes: publication.bytes,
                accessibleDescription: `A picture you chose for ${target.title}.`,
                previewUrl: previewObjectUrl,
                fileName: file.name,
              },
            }
          : current,
      );
      setStatus(`${file.name} is ready. Save adjustments to put it on this badge.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setReadingImage(false);
    }
  }

  async function save() {
    if (!draft || !target || busy || !dirty) return;
    const problem = firstTagProblem(draft.tags);
    if (problem) {
      setTagProblem(problem);
      setStatus("Fix the tags before saving.");
      return;
    }
    setTagProblem(null);
    setSaving(true);
    try {
      const result = await onApply(toStudioSubmission(draft, target));
      setStatus(result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (!target || !draft || !previewUrl || !previewRecipe) {
    return (
      <div className="studio-shell studio-shell--empty">
        <main className="studio-empty">
          <p className="eyebrow">Badge Studio</p>
          <h1>Open a badge to adjust it.</h1>
          <p>
            Badge Studio adjusts one badge at a time. Find it in Discover, open it, and choose
            <strong> Adjust in Badge Studio</strong>.
          </p>
          <button className="studio-save" type="button" onClick={onClose}>
            Go to Discover
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="studio-shell" aria-busy={busy || undefined}>
      <StudioHeader
        badgeTitle={target.title}
        dirty={dirty}
        saving={saving}
        disabled={leaving}
        onClose={onClose}
        onSave={() => void save()}
      />

      <main className="studio-main">
        <section className="construction-bench">
          <div className="artifact-heading">
            <div>
              <p className="eyebrow">Live construction</p>
              <h2>{target.title}</h2>
            </div>
            <span>{isCatalogueDefaultDraft(draft, target) ? "Catalogue default" : "Adjusted"}</span>
          </div>
          <BadgeViewer
            sourceUrl={previewUrl}
            recipe={previewRecipe}
            accessibleDescription={`${target.title} badge under adjustment`}
            readOnly={false}
            forceFallback={new URLSearchParams(window.location.search).has("fallback")}
          />
          <p className="status-line" role="status">
            {status}
          </p>
          {faceSealed ? (
            <p className="studio-panel__problem">
              {target.title} is already collected, so its picture, shape, material, border and quote are
              sealed with that memory. Tags and collections can still change.
            </p>
          ) : null}
          <div className="studio-bench-actions">
            <button
              type="button"
              disabled={busy || isCatalogueDefaultDraft(draft, target) || faceSealed}
              onClick={() => setDraft(catalogueDefaultDraft(target))}
            >
              Reset to catalogue default
            </button>
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => {
                setDraft(initialStudioDraft(target));
                setTagProblem(null);
                setStatus("Discarded the unsaved adjustments.");
              }}
            >
              Discard changes
            </button>
          </div>
        </section>

        <section className="adjustment-bench">
          <div className="workbench-heading">
            <p className="eyebrow">Adjustments</p>
            <h1>{target.title}</h1>
            <p>{target.criterion}</p>
          </div>

          <StudioImagePanel
            target={target}
            pendingImage={draft.pendingImage}
            usingOwnImage={usesOwnImage(draft, target)}
            disabled={faceDisabled}
            busy={readingImage}
            uploadInput={uploadInput}
            onPick={(event) => void pickImage(event)}
            onUseCatalogueImage={() =>
              setDraft((current) =>
                current ? { ...current, pendingImage: null, useCatalogueImage: true } : current,
              )
            }
          />

          <section className="studio-panel" aria-labelledby="studio-appearance-heading">
            <h3 id="studio-appearance-heading">Shape, material and border</h3>
            <StudioAppearancePanel
              appearance={draft.appearance}
              target={target}
              disabled={faceDisabled}
              onChange={updateAppearance}
            />
          </section>

          <StudioTagsPanel
            tags={draft.tags}
            disabled={busy}
            problem={tagProblem}
            onAdd={(tag) => {
              const problem = firstTagProblem([...draft.tags, tag]);
              setTagProblem(problem);
              if (!problem) setDraft((current) => (current ? withToggledTag(current, tag) : current));
            }}
            onRemove={(tag) => {
              setTagProblem(null);
              setDraft((current) => (current ? withoutTag(current, tag) : current));
            }}
          />

          <StudioQuotePanel
            quotations={target.quotations}
            selectedQuotationId={draft.quotationId}
            sealed={faceSealed}
            disabled={busy}
            onSelect={(quotationId) =>
              setDraft((current) => (current ? { ...current, quotationId } : current))
            }
          />

          <StudioCollectionsPanel
            target={target}
            selectedKeys={draft.collectionKeys}
            disabled={busy}
            onToggle={(key) =>
              setDraft((current) => (current ? withToggledCollection(current, key) : current))
            }
          />
        </section>
      </main>
    </div>
  );
}
