import type { RefObject } from "react";

import { ArrowIcon, ReplayIcon } from "./icons";

interface ReplayActivationButtonProps {
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
  readonly onReplay: () => void;
}

export function ReplayActivationButton({ buttonRef, onReplay }: ReplayActivationButtonProps) {
  return (
    <button ref={buttonRef} className="replay-activation" type="button" onClick={onReplay}>
      <span className="replay-activation__emblem" aria-hidden="true">
        <ReplayIcon />
      </span>
      <span className="replay-activation__copy">
        <strong>Replay activation</strong>
        <span>Watch the ceremony again</span>
      </span>
      <ArrowIcon className="replay-activation__arrow" />
    </button>
  );
}
