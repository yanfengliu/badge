import { useReducer, type KeyboardEvent } from "react";
import {
  artStyleLibrary,
  commonAchievementIdeas,
  usNationalParks,
  type ArtStyleDefinition,
  type CandidateRole,
} from "@badge/catalogue-authoring";

import "./art-direction-library.css";
import "./art-direction-library-media.css";
import {
  compileArtDirectionPrompt,
  filterArtStyles,
  filterCommonIdeas,
  filterNationalParks,
  formatDirectionCount,
} from "./art-direction-library-model";
import { requireStyle, writeToClipboard } from "./art-direction-library-utils";
import {
  artDirectionReducer,
  createInitialArtDirectionState,
  resolveVisibleSelection,
  type ArtDirectionTab,
} from "./art-direction-library-state";
import {
  nationalParkMediaResolver,
  type NationalParkMediaIssue,
  type NationalParkMediaResolution,
  type NationalParkMediaResolver,
} from "./national-park-source-urls";

const tabs: readonly ArtDirectionTab[] = ["parks", "ideas", "styles"];
const tabMeta = {
  parks: {
    label: "National parks",
    count: `${usNationalParks.length} national parks`,
    search: "Search national parks",
    placeholder: "Place, state, or landscape cue",
  },
  ideas: {
    label: "Common achievements",
    count: `${commonAchievementIdeas.length} ideas`,
    search: "Search common achievements",
    placeholder: "Milestone, craft, or theme",
  },
  styles: {
    label: "Art styles",
    count: `${artStyleLibrary.length} styles`,
    search: "Search art styles",
    placeholder: "Medium, family, or quality",
  },
} as const;
const roleOrder: readonly CandidateRole[] = ["landmark-witness", "emblematic-metaphor", "terrain-memory"];
const roleLabels: Record<CandidateRole, { label: string; caption: string }> = {
  "landmark-witness": { label: "Landmark", caption: "Recognition first" },
  "emblematic-metaphor": { label: "Metaphor", caption: "Emotion first" },
  "terrain-memory": { label: "Terrain", caption: "Movement first" },
};

export function ArtDirectionLibrary({
  mediaResolver = nationalParkMediaResolver,
}: {
  mediaResolver?: NationalParkMediaResolver;
} = {}) {
  const [state, dispatch] = useReducer(artDirectionReducer, undefined, createInitialArtDirectionState);
  const { activeTab, query, role, styleOverrideId, copyStatus } = state;
  const parks = filterNationalParks(query);
  const ideas = filterCommonIdeas(query);
  const styles = filterArtStyles(query);
  const selectedParkSlug = resolveVisibleSelection(
    parks.map((park) => park.slug),
    state.selectedParkSlug,
  );
  const selectedIdeaId = resolveVisibleSelection(
    ideas.map((idea) => idea.id),
    state.selectedIdeaId,
  );
  const selectedStyleId = resolveVisibleSelection(
    styles.map((style) => style.id),
    state.selectedStyleId,
  );
  const resultCount =
    activeTab === "parks" ? parks.length : activeTab === "ideas" ? ideas.length : styles.length;
  const parkRows =
    activeTab === "parks"
      ? parks.map((park) => ({
          park,
          thumbnail: mediaResolver.listThumbnail(park.selectedSource.fileName),
        }))
      : [];
  const missingThumbnailIssues = parkRows.flatMap(({ thumbnail }) =>
    thumbnail.status === "missing" ? [thumbnail.issue] : [],
  );
  const preview =
    activeTab === "styles" || (activeTab === "parks" ? !selectedParkSlug : !selectedIdeaId)
      ? null
      : compileArtDirectionPrompt(
          {
            kind: activeTab === "parks" ? "park" : "idea",
            id: activeTab === "parks" ? selectedParkSlug! : selectedIdeaId!,
            role,
            styleId: styleOverrideId,
          },
          mediaResolver,
        );
  const selectedStyle = selectedStyleId ? requireStyle(selectedStyleId) : null;

  function selectTab(tab: ArtDirectionTab): void {
    dispatch({ type: "select-tab", tab });
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, tab: ArtDirectionTab): void {
    const current = tabs.indexOf(tab);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    const nextTab = tabs[next];
    selectTab(nextTab);
    document.getElementById(`art-direction-tab-${nextTab}`)?.focus();
  }

  async function copyPrompt(): Promise<void> {
    if (!preview) return;
    try {
      await writeToClipboard(preview.compiled.prompt);
      dispatch({ type: "report-copy", status: "Exact compiled prompt copied." });
    } catch {
      dispatch({
        type: "report-copy",
        status: "Clipboard access was unavailable. Select the prompt text and copy it manually.",
      });
    }
  }

  return (
    <section className="art-direction-library" aria-labelledby="art-direction-title">
      <header className="art-direction-library__header">
        <div>
          <p className="art-direction-library__eyebrow">Catalogue authoring · local curation</p>
          <h2 id="art-direction-title">A wider visual language.</h2>
          <p className="art-direction-library__intro">
            Explore every park, common life achievements, and the versioned source-art styles that can shape
            their candidate studies.
          </p>
        </div>
        <div className="art-direction-library__truth" id="art-direction-truth" role="status">
          <strong>Source studies are not published Archive badges.</strong>
          <span>Browsing and changing art direction makes zero provider or model calls.</span>
        </div>
      </header>

      <div className="art-direction-library__tabs" role="tablist" aria-label="Authoring library">
        {tabs.map((tab) => (
          <button
            key={tab}
            id={`art-direction-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="art-direction-panel"
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => selectTab(tab)}
            onKeyDown={(event) => handleTabKey(event, tab)}
          >
            <span>{tabMeta[tab].label}</span>
            <small>{tabMeta[tab].count}</small>
          </button>
        ))}
      </div>

      <div
        className="art-direction-library__panel"
        id="art-direction-panel"
        role="tabpanel"
        aria-labelledby={`art-direction-tab-${activeTab}`}
        aria-describedby="art-direction-truth"
      >
        <aside className="art-direction-library__index">
          <label htmlFor={`art-direction-search-${activeTab}`}>{tabMeta[activeTab].search}</label>
          <div className="art-direction-library__search">
            <input
              id={`art-direction-search-${activeTab}`}
              type="search"
              value={query}
              placeholder={tabMeta[activeTab].placeholder}
              onChange={(event) => dispatch({ type: "set-query", query: event.target.value })}
            />
          </div>
          <p className="art-direction-library__result-count" aria-live="polite">
            {formatDirectionCount(resultCount)}
          </p>
          {missingThumbnailIssues.length > 0 && <ThumbnailErrorNotice issues={missingThumbnailIssues} />}

          <nav className="art-direction-library__items" aria-label={`${tabMeta[activeTab].label} results`}>
            {activeTab === "parks" &&
              parkRows.map(({ park, thumbnail }) => (
                <IndexButton
                  key={park.slug}
                  selected={park.slug === selectedParkSlug}
                  title={park.shortName}
                  meta={`${park.locationLabel} · ${park.npsSiteCode.toUpperCase()}`}
                  media={thumbnail}
                  onClick={() => dispatch({ type: "select-park", slug: park.slug })}
                />
              ))}
            {activeTab === "ideas" &&
              ideas.map((idea) => (
                <IndexButton
                  key={idea.id}
                  selected={idea.id === selectedIdeaId}
                  title={idea.title}
                  meta={idea.category}
                  onClick={() => dispatch({ type: "select-idea", id: idea.id })}
                />
              ))}
            {activeTab === "styles" &&
              styles.map((style) => (
                <IndexButton
                  key={style.id}
                  selected={style.id === selectedStyleId}
                  title={style.label}
                  meta={`${style.family} · revision ${style.revision}`}
                  onClick={() => dispatch({ type: "select-style", id: style.id })}
                />
              ))}
            {((activeTab === "parks" && parks.length === 0) ||
              (activeTab === "ideas" && ideas.length === 0) ||
              (activeTab === "styles" && styles.length === 0)) && (
              <p className="art-direction-library__empty">
                No matching direction. Try a place, cue, or medium.
              </p>
            )}
          </nav>
        </aside>

        <article className="art-direction-library__detail">
          {preview ? (
            <PromptDetail
              preview={preview}
              overrideStyleId={styleOverrideId}
              copyStatus={copyStatus}
              onRoleChange={(nextRole) => {
                dispatch({ type: "select-role", role: nextRole });
              }}
              onStyleChange={(styleId) => {
                dispatch({ type: "override-style", id: styleId });
              }}
              onCopy={() => void copyPrompt()}
            />
          ) : selectedStyle ? (
            <StyleDetail style={selectedStyle} />
          ) : (
            <p className="art-direction-library__detail-empty">
              No matching direction is selected. Refine or clear the search to continue.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}

function ThumbnailErrorNotice({ issues }: { issues: readonly NationalParkMediaIssue[] }) {
  const visibleFileNames = issues.slice(0, 3).map((issue) => issue.fileName);
  const additionalCount = issues.length - visibleFileNames.length;
  return (
    <div className="art-direction-library__thumbnail-error" role="alert">
      <strong>Catalogue thumbnails need repair</strong>
      <p>
        {issues.length} {issues.length === 1 ? "thumbnail is" : "thumbnails are"} missing:{" "}
        <code>{visibleFileNames.join(", ")}</code>
        {additionalCount > 0 ? `, plus ${additionalCount} more` : ""}.
      </p>
      <span>{issues[0].recovery}</span>
    </div>
  );
}

function IndexButton({
  selected,
  title,
  meta,
  media,
  onClick,
}: {
  selected: boolean;
  title: string;
  meta: string;
  media?: NationalParkMediaResolution;
  onClick: () => void;
}) {
  const imageUrl = media?.status === "ready" ? media.url : null;
  return (
    <button
      type="button"
      className={media ? "has-source-study" : undefined}
      aria-pressed={selected}
      aria-label={
        media?.status === "missing" ? `${title}, ${meta}. Catalogue thumbnail unavailable.` : undefined
      }
      onClick={onClick}
    >
      {imageUrl && <img src={imageUrl} alt="" loading="lazy" decoding="async" />}
      {media?.status === "missing" && (
        <>
          <span className="art-direction-library__thumbnail-missing" aria-hidden="true">
            !
          </span>
        </>
      )}
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <i aria-hidden="true">{selected ? "●" : "○"}</i>
    </button>
  );
}

function PromptDetail({
  preview,
  overrideStyleId,
  copyStatus,
  onRoleChange,
  onStyleChange,
  onCopy,
}: {
  preview: ReturnType<typeof compileArtDirectionPrompt>;
  overrideStyleId: string | null;
  copyStatus: string | null;
  onRoleChange: (role: CandidateRole) => void;
  onStyleChange: (styleId: string | null) => void;
  onCopy: () => void;
}) {
  return (
    <>
      <div className="art-direction-library__detail-heading">
        <div>
          <p className="art-direction-library__eyebrow">
            {preview.sourceStudyStatus === "selected-source-study"
              ? "Selected source study · unpublished"
              : "Common idea · no source study yet"}
          </p>
          <h3>{preview.subjectTitle}</h3>
          <p>{preview.subjectCriterion}</p>
        </div>
        <span className="art-direction-library__recipe">
          {preview.compiled.recipe.id}@{preview.compiled.recipe.revision}
        </span>
      </div>

      {preview.sourceStudyMedia?.status === "ready" && (
        <figure className="art-direction-library__source-study">
          <img src={preview.sourceStudyMedia.url} alt={preview.sourceStudyDescription ?? ""} />
          <figcaption>
            <strong>Selected source study</strong>
            <span>
              {preview.compiled.candidateKey === preview.selectedCandidateKey
                ? "This is the chosen landmark candidate. Physical construction happens later in the renderer."
                : "This image remains the chosen landmark candidate; the controls below preview another direction without replacing it."}
            </span>
          </figcaption>
        </figure>
      )}
      {preview.sourceStudyMedia?.status === "missing" && (
        <div className="art-direction-library__media-error" role="alert">
          <strong>Selected source study unavailable</strong>
          <p>
            {preview.sourceStudyMedia.issue.message} Missing file:{" "}
            <code>{preview.sourceStudyMedia.issue.fileName}</code>
          </p>
          <span>{preview.sourceStudyMedia.issue.recovery}</span>
        </div>
      )}

      <fieldset className="art-direction-library__roles">
        <legend>Candidate role</legend>
        <div>
          {roleOrder.map((role) => (
            <button
              key={role}
              type="button"
              aria-pressed={preview.role === role}
              onClick={() => onRoleChange(role)}
            >
              <strong>{roleLabels[role].label}</strong>
              <small>{roleLabels[role].caption}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="art-direction-library__style-control">
        <label htmlFor="art-direction-style-override">
          <span>Source-art style</span>
          <select
            id="art-direction-style-override"
            value={preview.style.id}
            onChange={(event) =>
              onStyleChange(event.target.value === preview.recommendedStyle.id ? null : event.target.value)
            }
          >
            {artStyleLibrary.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label} · {style.family}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>Recommended: {preview.recommendedStyle.label}</span>
          {overrideStyleId && (
            <button type="button" onClick={() => onStyleChange(null)}>
              Restore recommendation
            </button>
          )}
        </div>
        <p>{preview.style.summary}</p>
      </div>

      <details className="art-direction-library__prompt-disclosure">
        <summary>
          <span className="art-direction-library__prompt-summary-copy">
            <span className="art-direction-library__eyebrow">Exact compiled prompt</span>
            <span className="art-direction-library__prompt-key">{preview.compiled.candidateKey}</span>
          </span>
          <span className="art-direction-library__prompt-toggle" aria-hidden="true">
            <span className="art-direction-library__prompt-when-closed">Show prompt</span>
            <span className="art-direction-library__prompt-when-open">Hide prompt</span>
          </span>
        </summary>
        <div className="art-direction-library__prompt-body">
          <div className="art-direction-library__prompt-actions">
            <button type="button" onClick={onCopy}>
              Copy prompt
            </button>
          </div>
          <pre className="art-direction-library__prompt" tabIndex={0} aria-label="Exact compiled art prompt">
            {preview.compiled.prompt}
          </pre>
          <p className="art-direction-library__copy-status" aria-live="polite">
            {copyStatus ?? "Copying uses the local clipboard only; it does not submit the prompt."}
          </p>
        </div>
      </details>
    </>
  );
}

function StyleDetail({ style }: { style: ArtStyleDefinition }) {
  return (
    <>
      <div className="art-direction-library__detail-heading">
        <div>
          <p className="art-direction-library__eyebrow">Style record · revision {style.revision}</p>
          <h3>{style.label}</h3>
          <p>{style.summary}</p>
        </div>
        <span className="art-direction-library__recipe">{style.family}</span>
      </div>
      <ol className="art-direction-library__directives">
        {style.promptDirectives.map((directive) => (
          <li key={directive}>{directive}</li>
        ))}
      </ol>
      <p className="art-direction-library__style-note">
        Selecting a style record changes no source study or published pack.
      </p>
    </>
  );
}
