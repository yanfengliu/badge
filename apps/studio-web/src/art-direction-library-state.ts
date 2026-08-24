import {
  artStyleLibrary,
  commonAchievementIdeas,
  usNationalParks,
  type CandidateRole,
} from "@badge/catalogue-authoring";

export type ArtDirectionTab = "parks" | "ideas" | "styles";

export interface ArtDirectionState {
  activeTab: ArtDirectionTab;
  query: string;
  selectedParkSlug: string;
  selectedIdeaId: string;
  selectedStyleId: string;
  role: CandidateRole;
  styleOverrideId: string | null;
  copyStatus: string | null;
}

export type ArtDirectionAction =
  | { type: "select-tab"; tab: ArtDirectionTab }
  | { type: "set-query"; query: string }
  | { type: "select-park"; slug: string }
  | { type: "select-idea"; id: string }
  | { type: "select-style"; id: string }
  | { type: "select-role"; role: CandidateRole }
  | { type: "override-style"; id: string | null }
  | { type: "report-copy"; status: string };

export function createInitialArtDirectionState(): ArtDirectionState {
  return {
    activeTab: "parks",
    query: "",
    selectedParkSlug: usNationalParks[0]?.slug ?? "",
    selectedIdeaId: commonAchievementIdeas[0]?.id ?? "",
    selectedStyleId: artStyleLibrary[0]?.id ?? "",
    role: "landmark-witness",
    styleOverrideId: null,
    copyStatus: null,
  };
}

export function artDirectionReducer(
  state: Readonly<ArtDirectionState>,
  action: Readonly<ArtDirectionAction>,
): ArtDirectionState {
  switch (action.type) {
    case "select-tab":
      return resetCandidateDirection({ ...state, activeTab: action.tab, query: "" });
    case "set-query":
      return { ...state, query: action.query, copyStatus: null };
    case "select-park":
      return resetCandidateDirection({ ...state, selectedParkSlug: action.slug });
    case "select-idea":
      return resetCandidateDirection({ ...state, selectedIdeaId: action.id });
    case "select-style":
      return { ...state, selectedStyleId: action.id, copyStatus: null };
    case "select-role":
      return { ...state, role: action.role, styleOverrideId: null, copyStatus: null };
    case "override-style":
      return { ...state, styleOverrideId: action.id, copyStatus: null };
    case "report-copy":
      return { ...state, copyStatus: action.status };
  }
}

export function resolveVisibleSelection(visibleIds: readonly string[], requestedId: string): string | null {
  if (visibleIds.includes(requestedId)) return requestedId;
  return visibleIds[0] ?? null;
}

function resetCandidateDirection(state: ArtDirectionState): ArtDirectionState {
  return {
    ...state,
    role: "landmark-witness",
    styleOverrideId: null,
    copyStatus: null,
  };
}
