import { useEffect, useRef, type PropsWithChildren, type RefObject } from "react";

import { containDisclosureBackgroundInteraction } from "./disclosure-background";
import type { SayingDisclosureGateSnapshot } from "./saying-disclosure-gate";
import { SayingDisclosureDialog } from "./SayingDisclosureDialog";

interface SayingDisclosureBoundaryProps extends PropsWithChildren {
  readonly state: SayingDisclosureGateSnapshot;
  readonly returnFocus: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
  readonly onApprove: () => void;
  readonly onRetry: () => void;
}

export function SayingDisclosureBoundary({
  state,
  returnFocus,
  onClose,
  onApprove,
  onRetry,
  children,
}: SayingDisclosureBoundaryProps) {
  const active = state.phase !== "idle";
  const contain = active ? containDisclosureBackgroundInteraction : undefined;
  const wasActive = useRef(active);

  useEffect(() => {
    const restoreAfterClose = wasActive.current && !active;
    wasActive.current = active;
    if (!restoreAfterClose) return;

    const animationFrame = requestAnimationFrame(() => {
      const target = returnFocus.current;
      if (target?.isConnected && !target.closest("[inert]")) target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [active, returnFocus]);

  return (
    <>
      <div
        className="archive-shell"
        inert={active ? true : undefined}
        aria-hidden={active ? true : undefined}
        onClickCapture={contain}
        onSubmitCapture={contain}
      >
        {children}
      </div>
      {active ? (
        <SayingDisclosureDialog
          state={state}
          returnFocus={returnFocus}
          onClose={onClose}
          onApprove={onApprove}
          onRetry={onRetry}
        />
      ) : null}
    </>
  );
}
