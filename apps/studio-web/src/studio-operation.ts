import { useCallback, useRef, useState } from "react";

export type StudioOperation = "uploading" | "processing" | "publishing";

export class StudioOperationGate {
  private current: StudioOperation | null = null;

  get active(): StudioOperation | null {
    return this.current;
  }

  tryBegin(operation: StudioOperation): boolean {
    if (this.current !== null) return false;
    this.current = operation;
    return true;
  }

  finish(operation: StudioOperation): void {
    if (this.current === operation) this.current = null;
  }
}

export function useStudioOperation() {
  const gate = useRef(new StudioOperationGate());
  const [busy, setBusy] = useState<StudioOperation | null>(null);
  const tryBegin = useCallback((operation: StudioOperation) => {
    if (!gate.current.tryBegin(operation)) return false;
    setBusy(operation);
    return true;
  }, []);
  const finish = useCallback((operation: StudioOperation) => {
    gate.current.finish(operation);
    setBusy(gate.current.active);
  }, []);
  const isBusy = useCallback(() => gate.current.active !== null, []);
  return { busy, tryBegin, finish, isBusy } as const;
}
