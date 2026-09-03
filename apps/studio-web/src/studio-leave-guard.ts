import { useCallback, useEffect, useRef, useState } from "react";

export type StudioLeaveGuard = () => Promise<boolean>;

export const STUDIO_UNSAVED_REFUSAL =
  "Badge Studio still has unsaved adjustments. Save them, or choose Discard changes, before leaving.";

export function protectStudioUnload(event: BeforeUnloadEvent, protectionRequired: boolean): boolean {
  if (!protectionRequired) return false;
  event.preventDefault();
  event.returnValue = "";
  return true;
}

/**
 * Holds the section change until unsaved adjustments are resolved. The Archive owns persistence
 * now, so there is nothing to flush here: the guard's whole job is refusing to let an
 * unsaved change disappear silently, and saying which action clears it.
 */
export function useStudioLeaveGuard({
  dirty,
  busy,
  onBlocked,
  onGuardChange,
}: {
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly onBlocked: (message: string) => void;
  readonly onGuardChange: (guard: StudioLeaveGuard | null) => void;
}): boolean {
  const [leaving, setLeaving] = useState(false);
  const latest = useRef({ dirty, busy });

  useEffect(() => {
    latest.current = { dirty, busy };
  }, [busy, dirty]);

  const guard = useCallback<StudioLeaveGuard>(async () => {
    const { dirty: unsaved, busy: working } = latest.current;
    if (working) {
      onBlocked("Badge Studio is still reading that image; wait for it to finish before leaving.");
      return false;
    }
    if (!unsaved) return true;
    setLeaving(true);
    try {
      onBlocked(STUDIO_UNSAVED_REFUSAL);
      return false;
    } finally {
      setLeaving(false);
    }
  }, [onBlocked]);

  useEffect(() => {
    onGuardChange(guard);
    return () => onGuardChange(null);
  }, [guard, onGuardChange]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      protectStudioUnload(event, latest.current.dirty || latest.current.busy);
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  return leaving;
}
