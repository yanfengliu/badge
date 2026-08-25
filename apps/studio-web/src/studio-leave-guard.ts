import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { RenderRecipe } from "@badge/render-recipe";

import type { Candidate } from "./studio-candidates";
import type { StudioPrimarySection } from "./StudioHeader";
import type { StudioOperation } from "./studio-operation";
import type { StudioStore } from "./studio-store";

export type StudioLeaveGuard = () => Promise<boolean>;

const REQUIRED_SAVE_REFUSAL =
  "Badge Studio could not preserve the current draft, so it will stay open. Keep this page open and retry after local storage is available.";
const AUTOSAVE_DELAY_MS = 180;

export interface StudioAppProps {
  readonly onSectionChange: (section: StudioPrimarySection) => void;
  readonly onLeaveGuardChange: (guard: StudioLeaveGuard | null) => void;
}

export async function prepareStudioLeave({
  busy,
  saveDraft,
  onBlocked,
  onSaveError,
}: {
  readonly busy: StudioOperation | null;
  readonly saveDraft?: () => Promise<unknown>;
  readonly onBlocked: (message: string) => void;
  readonly onSaveError: (error: unknown) => void;
}): Promise<boolean> {
  if (busy) {
    onBlocked(`Badge Studio is still ${busy}; wait for that operation to finish before changing sections.`);
    return false;
  }
  try {
    await saveDraft?.();
    return true;
  } catch (error) {
    onSaveError(error);
    return false;
  }
}

export function protectStudioUnload(event: BeforeUnloadEvent, protectionRequired: boolean): boolean {
  if (!protectionRequired) return false;
  event.preventDefault();
  event.returnValue = "";
  return true;
}

export function useStudioLeaveGuard({
  autosave,
  busy,
  onBlocked,
  onGuardChange,
  onSaveError,
  recipe,
  selected,
  store,
  storeReady,
}: {
  readonly autosave: boolean;
  readonly busy: StudioOperation | null;
  readonly onBlocked: (message: string) => void;
  readonly onGuardChange: (guard: StudioLeaveGuard | null) => void;
  readonly onSaveError: (error: unknown) => void;
  readonly recipe: RenderRecipe;
  readonly selected: Candidate | null;
  readonly store: RefObject<StudioStore | null>;
  readonly storeReady: boolean;
}) {
  const [leaving, setLeaving] = useState(false);
  const latest = useRef({ autosave, busy, recipe, selected, storeReady });
  const leaveAttempt = useRef<Promise<boolean> | null>(null);
  const requiredSaveFailed = useRef(false);
  const pendingWrites = useRef(0);
  const draftWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const draftRevision = useRef(0);
  const dirty = useRef(false);
  const autosaveTimer = useRef<number | null>(null);
  const handlers = useRef({ onBlocked, onSaveError });
  const recoveredStore = useRef<StudioStore | null>(null);

  useLayoutEffect(() => {
    latest.current = { autosave, busy, recipe, selected, storeReady };
    handlers.current = { onBlocked, onSaveError };
    const activeStore = store.current;
    if (storeReady && activeStore && activeStore !== recoveredStore.current) {
      if (recoveredStore.current) requiredSaveFailed.current = false;
      recoveredStore.current = activeStore;
    }
  }, [autosave, busy, onBlocked, onSaveError, recipe, selected, store, storeReady]);

  const queueDraftWrite = useCallback(
    (
      activeStore: StudioStore,
      selectedCandidate: Candidate,
      exactRecipe: RenderRecipe,
      revision: number,
      required: boolean,
    ) => {
      pendingWrites.current += 1;
      const write = draftWriteQueue.current
        .then(async () => {
          if (!required && revision !== draftRevision.current) return false;
          await activeStore.saveDraft({
            selectedAssetHash: selectedCandidate.hash,
            selectedCandidateIdentity: selectedCandidate.identity,
            renderRecipe: exactRecipe,
          });
          return true;
        })
        .then((wrote) => {
          if (wrote && revision === draftRevision.current) dirty.current = false;
          return wrote;
        });
      draftWriteQueue.current = write.then(
        () => undefined,
        () => undefined,
      );
      return write.finally(() => {
        pendingWrites.current -= 1;
      });
    },
    [],
  );

  useLayoutEffect(() => {
    const activeStore = store.current;
    if (!autosave || !selected || !storeReady || !activeStore) return;
    dirty.current = true;
    const revision = ++draftRevision.current;
    autosaveTimer.current = window.setTimeout(() => {
      autosaveTimer.current = null;
      const current = latest.current;
      const currentStore = store.current;
      if (!current.autosave || !current.selected || !current.storeReady || !currentStore) return;
      void queueDraftWrite(currentStore, current.selected, current.recipe, revision, false).catch(
        (error: unknown) => {
          requiredSaveFailed.current = true;
          handlers.current.onSaveError(error);
        },
      );
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    };
  }, [autosave, queueDraftWrite, recipe, selected, store, storeReady]);

  const guard = useCallback(() => {
    if (leaveAttempt.current) return leaveAttempt.current;
    const current = latest.current;
    const activeStore = store.current;
    const selectedCandidate = current.selected;
    const saveDraft =
      current.autosave && selectedCandidate && current.storeReady && activeStore
        ? () => queueDraftWrite(activeStore, selectedCandidate, current.recipe, draftRevision.current, true)
        : undefined;
    if (current.busy) {
      return prepareStudioLeave({
        busy: current.busy,
        saveDraft,
        onBlocked: handlers.current.onBlocked,
        onSaveError: handlers.current.onSaveError,
      });
    }
    if (requiredSaveFailed.current || ((dirty.current || pendingWrites.current > 0) && !saveDraft)) {
      requiredSaveFailed.current = true;
      handlers.current.onBlocked(REQUIRED_SAVE_REFUSAL);
      return Promise.resolve(false);
    }
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
    setLeaving(true);
    const attempt = prepareStudioLeave({
      busy: null,
      saveDraft,
      onBlocked: handlers.current.onBlocked,
      onSaveError: handlers.current.onSaveError,
    })
      .then((allowed) => {
        if (!allowed && saveDraft) requiredSaveFailed.current = true;
        return allowed;
      })
      .finally(() => {
        if (leaveAttempt.current === attempt) leaveAttempt.current = null;
        setLeaving(false);
      });
    leaveAttempt.current = attempt;
    return attempt;
  }, [queueDraftWrite, store]);

  useEffect(() => {
    onGuardChange(guard);
    return () => onGuardChange(null);
  }, [guard, onGuardChange]);

  useLayoutEffect(() => {
    const protectUnload = (event: BeforeUnloadEvent) => {
      protectStudioUnload(event, dirty.current || pendingWrites.current > 0 || requiredSaveFailed.current);
    };
    window.addEventListener("beforeunload", protectUnload);
    return () => window.removeEventListener("beforeunload", protectUnload);
  }, []);

  return leaving;
}
