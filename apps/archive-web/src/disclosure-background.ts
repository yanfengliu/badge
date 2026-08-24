import type { SyntheticEvent } from "react";

export function containDisclosureBackgroundInteraction(
  event: Pick<SyntheticEvent, "preventDefault" | "stopPropagation">,
): void {
  event.preventDefault();
  event.stopPropagation();
}
