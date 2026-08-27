import { useEffect } from "react";

import type { DiscoveryPager, DiscoveryPagerStep } from "./discovery-pager";

type PagerKeyEvent = Pick<
  KeyboardEvent,
  "key" | "defaultPrevented" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

const reservedKeyTargets = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  ".badge-viewer__viewport",
].join(", ");

export function discoveryPagerStepForKey(
  pager: DiscoveryPager | null,
  event: PagerKeyEvent,
  target: EventTarget | null,
): DiscoveryPagerStep | null {
  if (!pager) return null;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return null;
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (target instanceof Element && target.closest(reservedKeyTargets)) return null;
  return event.key === "ArrowLeft" ? pager.previous : pager.next;
}

export function useDiscoveryPagerKeys(
  pager: DiscoveryPager | null,
  onStep: (step: DiscoveryPagerStep) => void,
): void {
  useEffect(() => {
    if (!pager) return;
    function onKeyDown(event: KeyboardEvent) {
      const step = discoveryPagerStepForKey(pager, event, event.target);
      if (!step) return;
      event.preventDefault();
      onStep(step);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pager, onStep]);
}
