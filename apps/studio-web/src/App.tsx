import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { studioFixtureCandidates } from "@badge/catalogue-fixtures/studio";
import { BadgeViewer } from "@badge/renderer-web";
import { DEFAULT_RENDER_RECIPE, type RenderRecipe } from "@badge/render-recipe";
import { ArtDirectionLibrary } from "./ArtDirectionLibrary";
import { candidateIdentityKey, uploadedCandidateIdentity } from "./candidate-identity";
import { assertStudioFixtureIntegrity } from "./fixture-integrity";
import {
  createStudioTreatment,
  normalizeStudioAssetForPublication,
  readImageAsset,
} from "./image-processing";
import { offerPackClosureDownload } from "./pack-download";
import { publishYosemitePack } from "./publish-pack";
import {
  attachVerifiedFixtureSnapshots,
  candidateKey,
  findEquivalentCandidate,
  initialCandidates,
  requireCandidateSnapshot,
  restoreStudioCandidates,
  type Candidate,
  type PublishedRelease,
} from "./studio-candidates";
import { StudioHeader } from "./StudioHeader";
import { useStudioOperation } from "./studio-operation";
import { candidateCapabilities, resolveCandidateSelection } from "./studio-selection";
import { StudioStoreError, openStudioStore, type StudioStore } from "./studio-store";
const forceFallback = new URLSearchParams(window.location.search).has("fallback");
const TREATMENT_OPERATION = "warm-mineral-treatment-v1";
export function App() {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedKey, setSelectedKey] = useState<string | null>(candidateKey(initialCandidates[0]));
  const [recipe, setRecipe] = useState<RenderRecipe>({
    ...DEFAULT_RENDER_RECIPE,
    crop: { ...DEFAULT_RENDER_RECIPE.crop },
  });
  const [status, setStatus] = useState("Opening local Studio storage…");
  const { busy, tryBegin, finish, isBusy } = useStudioOperation();
  const [storeReady, setStoreReady] = useState(false);
  const [publishedRelease, setPublishedRelease] = useState<PublishedRelease | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const ownedUrls = useRef(new Set<string>());
  const store = useRef<StudioStore | null>(null);
  const selected = useMemo(
    () => resolveCandidateSelection(candidates, selectedKey),
    [candidates, selectedKey],
  );
  const capabilities = candidateCapabilities(selected);
  const handleStorageFailure = useCallback((error: unknown) => {
    if (error instanceof StudioStoreError) {
      store.current?.close();
      store.current = null;
      setStoreReady(false);
    }
    setStatus(error instanceof Error ? error.message : String(error));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let opened: StudioStore | null = null;
    const urls = ownedUrls.current;
    async function initialize() {
      try {
        opened = await openStudioStore({
          onConnectionIssue(error) {
            if (!cancelled) handleStorageFailure(error);
          },
        });
        if (cancelled) return opened.close();
        store.current = opened;
        const fixtureAssets = [];
        for (const candidate of studioFixtureCandidates) {
          const asset = await readImageAsset(candidate.sourceUrl);
          assertStudioFixtureIntegrity(candidate, asset);
          fixtureAssets.push(asset);
        }
        for (const [index, asset] of fixtureAssets.entries()) {
          await opened.saveOriginal(asset.blob, initialCandidates[index].identity);
        }
        const verifiedInitialCandidates = attachVerifiedFixtureSnapshots(initialCandidates, fixtureAssets);
        const assets = await opened.loadAssets();
        const draft = await opened.loadDraft();
        if (cancelled) return;
        const restored = restoreStudioCandidates({
          fixtureCandidates: verifiedInitialCandidates,
          assets,
          selectedIdentity: draft?.selectedCandidateIdentity ?? null,
          legacySelectedHash: draft?.selectedAssetHash ?? null,
          createSourceUrl(blob) {
            const sourceUrl = URL.createObjectURL(blob);
            urls.add(sourceUrl);
            return sourceUrl;
          },
        });
        setCandidates(restored.candidates);
        if (draft) {
          setRecipe(draft.renderRecipe);
          setSelectedKey(restored.selectedKey);
        }
        setStoreReady(true);
        setStatus(
          restored.selectionWarning ??
            (draft
              ? "Restored the last Studio draft from local storage."
              : "Three source-art proposals are ready for review."),
        );
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : String(error));
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      opened?.close();
      store.current = null;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, [handleStorageFailure]);

  useEffect(() => {
    if (!capabilities.autosave || !selected || !storeReady || !store.current) return;
    const timeout = window.setTimeout(() => {
      store.current
        ?.saveDraft({
          selectedAssetHash: selected.hash,
          selectedCandidateIdentity: selected.identity,
          renderRecipe: recipe,
        })
        .catch((error: unknown) => {
          handleStorageFailure(error);
        });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [capabilities.autosave, handleStorageFailure, recipe, selected, storeReady]);

  function updateRecipe(patch: Partial<RenderRecipe>) {
    if (!storeReady || isBusy() || publishedRelease) return;
    setRecipe((current) => ({ ...current, ...patch }) as RenderRecipe);
  }

  function selectCandidate(key: string) {
    if (!storeReady || isBusy() || publishedRelease) return;
    setSelectedKey(key);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const activeStore = store.current;
    if (!file || !storeReady || !activeStore || publishedRelease || !tryBegin("uploading")) return;
    try {
      const asset = await readImageAsset(file);
      const identity = uploadedCandidateIdentity(asset.hash);
      const stored = await activeStore.saveOriginal(asset.blob, identity);
      const existing = findEquivalentCandidate(candidates, identity);
      if (existing) {
        setSelectedKey(candidateKey(existing));
        setStatus(`${file.name} already exists in Studio; its existing candidate is selected.`);
        return;
      }
      const sourceUrl = URL.createObjectURL(stored.blob);
      ownedUrls.current.add(sourceUrl);
      const candidate: Candidate = {
        id: `upload:${candidateIdentityKey(identity)}`,
        label: file.name,
        direction: "Immutable upload",
        sourceUrl,
        hash: stored.hash,
        origin: "uploaded",
        provenance: "uploaded",
        identity,
        blob: stored.blob,
      };
      setCandidates((current) => [...current, candidate]);
      setSelectedKey(candidateKey(candidate));
      setStatus(
        `${file.name} was stored as a new source candidate; generated proposals were left untouched.`,
      );
    } catch (error) {
      handleStorageFailure(error);
    } finally {
      finish("uploading");
    }
  }

  async function reprocess() {
    const activeStore = store.current;
    if (
      !capabilities.process ||
      !selected ||
      !storeReady ||
      !activeStore ||
      publishedRelease ||
      !tryBegin("processing")
    )
      return;
    try {
      const asset = await createStudioTreatment(requireCandidateSnapshot(selected));
      const stored = await activeStore.saveDerivative(selected.identity, asset.blob, TREATMENT_OPERATION);
      const identity = stored.candidateIdentity;
      const existing = findEquivalentCandidate(candidates, identity);
      if (existing) {
        setSelectedKey(candidateKey(existing));
        setStatus("That exact treatment already exists; its existing candidate is selected.");
        return;
      }
      const sourceUrl = URL.createObjectURL(stored.asset.blob);
      ownedUrls.current.add(sourceUrl);
      const candidate: Candidate = {
        id: `processed:${candidateIdentityKey(identity)}`,
        label: `${selected.label} · treatment`,
        direction: "Warm mineral treatment",
        sourceUrl,
        hash: stored.asset.hash,
        origin: "processed",
        provenance: selected.provenance,
        identity,
        blob: stored.asset.blob,
      };
      setCandidates((current) => [...current, candidate]);
      setSelectedKey(candidateKey(candidate));
      setStatus("A non-destructive treatment was added. The selected source remains available.");
    } catch (error) {
      handleStorageFailure(error);
    } finally {
      finish("processing");
    }
  }

  async function publish() {
    const activeStore = store.current;
    if (
      !capabilities.publish ||
      !selected ||
      !storeReady ||
      !activeStore ||
      publishedRelease ||
      !tryBegin("publishing")
    )
      return;
    try {
      const asset = await normalizeStudioAssetForPublication(requireCandidateSnapshot(selected));
      if (asset.hash !== selected.hash) {
        await activeStore.saveDerivative(selected.identity, asset.blob, "publication-png-v1");
      }
      const result = await publishYosemitePack({
        asset,
        recipe,
        provenance: selected.provenance,
        accessibleDescription:
          "A crafted Yosemite badge showing granite walls, river, and a path through the valley.",
      });
      offerPackClosureDownload(result.bytes, result.themeDependency.bytes);
      setPublishedRelease({
        packId: result.packRef.packId,
        version: result.packRef.version,
        digest: result.packRef.packDigest,
        bytes: result.bytes,
        themeBytes: result.themeDependency.bytes,
      });
      setStatus(
        "The pack and its exact admitted theme dependency were offered for download. Archive installation arrives in a later slice.",
      );
    } catch (error) {
      handleStorageFailure(error);
    } finally {
      finish("publishing");
    }
  }

  return (
    <div className="studio-shell">
      <StudioHeader />

      <main className="studio-main">
        <section className="source-workbench">
          <div className="workbench-heading">
            <p className="eyebrow">Source art · candidate selection</p>
            <h1>A shape for the memory.</h1>
            <p>
              Choose the visual idea first. The renderer—not the artwork—owns the object, edge, and material.
            </p>
          </div>

          <div className="candidate-grid" aria-label="Source art candidates">
            {candidates.map((candidate, index) => (
              <button
                key={candidateKey(candidate)}
                type="button"
                className="candidate"
                aria-pressed={candidateKey(candidate) === selectedKey}
                disabled={!storeReady || busy !== null || publishedRelease !== null}
                onClick={() => selectCandidate(candidateKey(candidate))}
              >
                <span className="candidate-index">{String(index + 1).padStart(2, "0")}</span>
                <img src={candidate.sourceUrl} alt="" />
                <span className="candidate-copy">
                  <strong>{candidate.label}</strong>
                  <small>
                    {candidate.direction} · {candidate.origin}
                  </small>
                </span>
                <span className="selection-mark">
                  {candidateKey(candidate) === selectedKey ? "Selected" : "Select"}
                </span>
              </button>
            ))}
          </div>

          <div className="source-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => uploadInput.current?.click()}
              disabled={!storeReady || busy !== null || publishedRelease !== null}
            >
              {busy === "uploading" ? "Uploading…" : "Upload my own image"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={reprocess}
              disabled={!capabilities.process || !storeReady || busy !== null || publishedRelease !== null}
            >
              {busy === "processing" ? "Processing…" : "Process selected again"}
            </button>
            <input
              ref={uploadInput}
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!storeReady || busy !== null || publishedRelease !== null}
              tabIndex={-1}
              aria-hidden="true"
              onChange={upload}
            />
          </div>
          <p className="status-line" role="status">
            {status}
          </p>
        </section>

        <section className="construction-bench">
          <div className="artifact-heading">
            <div>
              <p className="eyebrow">Live construction</p>
              <h2>Yosemite</h2>
            </div>
            <span>{publishedRelease ? "Frozen pack ready" : "Recipe v1 · unpublished"}</span>
          </div>
          <BadgeViewer
            sourceUrl={selected?.sourceUrl ?? candidates[0].sourceUrl}
            recipe={recipe}
            accessibleDescription="Yosemite badge under construction"
            readOnly={false}
            forceFallback={forceFallback}
          />

          <div className="appearance-controls">
            <fieldset disabled={!storeReady || busy !== null || publishedRelease !== null}>
              <legend>Shape</legend>
              <div className="segment">
                {(["circle", "square", "rectangle", "shield"] as const).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    aria-pressed={recipe.shape === shape}
                    onClick={() => updateRecipe({ shape })}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset disabled={!storeReady || busy !== null || publishedRelease !== null}>
              <legend>Material</legend>
              <div className="segment">
                {(["metal", "wool", "enamel"] as const).map((material) => (
                  <button
                    key={material}
                    type="button"
                    aria-pressed={recipe.material === material}
                    onClick={() => updateRecipe({ material })}
                  >
                    {material === "wool" ? "Wool armband" : material}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="control-row">
              <label>
                <span>Border color</span>
                <span className="color-control">
                  <input
                    type="color"
                    disabled={!storeReady || busy !== null || publishedRelease !== null}
                    value={recipe.borderColor}
                    onChange={(event) => updateRecipe({ borderColor: event.target.value })}
                  />
                  <output>{recipe.borderColor}</output>
                </span>
              </label>
              <label>
                <span>
                  Border width <output>{Math.round(recipe.borderWidth * 100)}%</output>
                </span>
                <input
                  type="range"
                  disabled={!storeReady || busy !== null || publishedRelease !== null}
                  min="0"
                  max="0.2"
                  step="0.005"
                  value={recipe.borderWidth}
                  onChange={(event) => updateRecipe({ borderWidth: Number(event.target.value) })}
                />
              </label>
            </div>
            <details>
              <summary>Object depth</summary>
              <div className="control-row">
                <label>
                  <span>
                    Thickness <output>{recipe.thickness.toFixed(2)}</output>
                  </span>
                  <input
                    type="range"
                    disabled={!storeReady || busy !== null || publishedRelease !== null}
                    min="0.02"
                    max="0.18"
                    step="0.005"
                    value={recipe.thickness}
                    onChange={(event) => updateRecipe({ thickness: Number(event.target.value) })}
                  />
                </label>
                <label>
                  <span>
                    Relief <output>{recipe.relief.toFixed(3)}</output>
                  </span>
                  <input
                    type="range"
                    disabled={!storeReady || busy !== null || publishedRelease !== null}
                    min="0"
                    max="0.05"
                    step="0.001"
                    value={recipe.relief}
                    onChange={(event) => updateRecipe({ relief: Number(event.target.value) })}
                  />
                </label>
              </div>
            </details>
          </div>

          <div className="publish-bar">
            <div>
              <strong>
                {publishedRelease ? "This edition is frozen." : "Ready to freeze this edition?"}
              </strong>
              <span>
                {publishedRelease
                  ? `${publishedRelease.packId} · ${publishedRelease.digest.slice(0, 12)}… · reload to reopen the draft`
                  : "Publishing writes an admitted pack and its exact theme dependency. Source drafts stay here."}
              </span>
            </div>
            <button
              className="button primary"
              type="button"
              onClick={() =>
                publishedRelease
                  ? offerPackClosureDownload(publishedRelease.bytes, publishedRelease.themeBytes)
                  : void publish()
              }
              disabled={!capabilities.publish || !storeReady || busy !== null}
            >
              {busy === "publishing"
                ? "Validating pack…"
                : publishedRelease
                  ? "Offer both files again"
                  : "Publish badge pack"}
            </button>
          </div>
        </section>
        <ArtDirectionLibrary />
      </main>
    </div>
  );
}
