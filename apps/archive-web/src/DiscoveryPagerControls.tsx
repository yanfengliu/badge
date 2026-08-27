import type { DiscoveryPager, DiscoveryPagerStep } from "./discovery-pager";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

interface DiscoveryPagerControlsProps {
  readonly pager: DiscoveryPager;
  readonly onStep: (step: DiscoveryPagerStep) => void;
}

export function DiscoveryPagerControls({ pager, onStep }: DiscoveryPagerControlsProps) {
  if (pager.total < 2) return null;
  return (
    <nav className="discovery-pager" aria-label={`${pager.contextTitle} badge navigation`}>
      <PagerStepButton direction="previous" step={pager.previous} onStep={onStep} />
      <p className="discovery-pager__position" aria-live="polite">
        <span className="visually-hidden">{pager.currentTitle}, badge </span>
        <span className="discovery-pager__index">
          {pager.index} of {pager.total}
        </span>
        <small>{pager.contextTitle}</small>
      </p>
      <PagerStepButton direction="next" step={pager.next} onStep={onStep} />
    </nav>
  );
}

function PagerStepButton({
  direction,
  step,
  onStep,
}: {
  readonly direction: "previous" | "next";
  readonly step: DiscoveryPagerStep | null;
  readonly onStep: (step: DiscoveryPagerStep) => void;
}) {
  const label = step
    ? `${direction === "previous" ? "Previous" : "Next"} badge: ${step.title}`
    : direction === "previous"
      ? "This is the first badge in this view"
      : "This is the last badge in this view";
  return (
    <button
      className="icon-button discovery-pager__step"
      type="button"
      aria-label={label}
      aria-keyshortcuts={direction === "previous" ? "ArrowLeft" : "ArrowRight"}
      aria-disabled={step ? undefined : true}
      onClick={step ? () => onStep(step) : undefined}
    >
      {direction === "previous" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}
