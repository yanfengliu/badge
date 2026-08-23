export interface SayingEditorState {
  readonly manualSayings: Readonly<Record<string, string>>;
  readonly manualErrors: Readonly<Record<string, string | null>>;
  readonly editingRecords: Readonly<Record<string, boolean>>;
  readonly savingRecords: Readonly<Record<string, boolean>>;
  readonly dirtyRecords: Readonly<Record<string, boolean>>;
}

export type SayingEditorAction =
  | { readonly type: "begin"; readonly recordId: string; readonly fallbackValue: string }
  | { readonly type: "hide"; readonly recordId: string }
  | { readonly type: "resume-dirty"; readonly recordId: string }
  | { readonly type: "cancel"; readonly recordId: string }
  | {
      readonly type: "change";
      readonly recordId: string;
      readonly value: string;
      readonly error: string | null;
      readonly dirty: boolean;
    }
  | { readonly type: "validation-error"; readonly recordId: string; readonly error: string }
  | { readonly type: "save-started"; readonly recordId: string }
  | { readonly type: "save-succeeded"; readonly recordId: string }
  | { readonly type: "save-finished"; readonly recordId: string }
  | { readonly type: "archive-restored" };

export const initialSayingEditorState: SayingEditorState = {
  manualSayings: {},
  manualErrors: {},
  editingRecords: {},
  savingRecords: {},
  dirtyRecords: {},
};

function withoutRecord<T>(values: Readonly<Record<string, T>>, recordId: string): Record<string, T> {
  const next = { ...values };
  delete next[recordId];
  return next;
}

export function reduceSayingEditorState(
  state: SayingEditorState,
  action: SayingEditorAction,
): SayingEditorState {
  if (action.type === "archive-restored") return initialSayingEditorState;
  if (action.type === "begin") {
    const retainedValue = state.manualSayings[action.recordId];
    return {
      ...state,
      manualSayings: {
        ...state.manualSayings,
        [action.recordId]: retainedValue ?? action.fallbackValue,
      },
      manualErrors: {
        ...state.manualErrors,
        [action.recordId]: retainedValue === undefined ? null : (state.manualErrors[action.recordId] ?? null),
      },
      editingRecords: { ...state.editingRecords, [action.recordId]: true },
      dirtyRecords: {
        ...state.dirtyRecords,
        [action.recordId]:
          retainedValue === undefined ? false : (state.dirtyRecords[action.recordId] ?? false),
      },
    };
  }
  if (action.type === "hide") {
    return {
      ...state,
      editingRecords: { ...state.editingRecords, [action.recordId]: false },
    };
  }
  if (action.type === "resume-dirty") {
    if (!state.dirtyRecords[action.recordId]) return state;
    return {
      ...state,
      editingRecords: { ...state.editingRecords, [action.recordId]: true },
    };
  }
  if (action.type === "cancel") {
    return {
      ...state,
      manualSayings: withoutRecord(state.manualSayings, action.recordId),
      manualErrors: withoutRecord(state.manualErrors, action.recordId),
      editingRecords: { ...state.editingRecords, [action.recordId]: false },
      dirtyRecords: { ...state.dirtyRecords, [action.recordId]: false },
    };
  }
  if (action.type === "change") {
    return {
      ...state,
      manualSayings: { ...state.manualSayings, [action.recordId]: action.value },
      manualErrors: { ...state.manualErrors, [action.recordId]: action.error },
      dirtyRecords: { ...state.dirtyRecords, [action.recordId]: action.dirty },
    };
  }
  if (action.type === "validation-error") {
    return {
      ...state,
      manualErrors: { ...state.manualErrors, [action.recordId]: action.error },
    };
  }
  if (action.type === "save-started") {
    return {
      ...state,
      savingRecords: { ...state.savingRecords, [action.recordId]: true },
    };
  }
  if (action.type === "save-succeeded") {
    return {
      ...state,
      manualSayings: withoutRecord(state.manualSayings, action.recordId),
      manualErrors: withoutRecord(state.manualErrors, action.recordId),
      editingRecords: { ...state.editingRecords, [action.recordId]: false },
      dirtyRecords: { ...state.dirtyRecords, [action.recordId]: false },
    };
  }
  return {
    ...state,
    savingRecords: { ...state.savingRecords, [action.recordId]: false },
  };
}
