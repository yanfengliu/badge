import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReplayActivationButton } from "./ReplayActivationButton.js";

describe("ReplayActivationButton", () => {
  it("presents replay as a deliberate ceremony action and preserves its callback", () => {
    const onReplay = vi.fn();
    const buttonRef = createRef<HTMLButtonElement>();
    const button = ReplayActivationButton({ buttonRef, onReplay });
    const html = renderToStaticMarkup(button);

    expect(html).toContain('class="replay-activation"');
    expect(html).toContain("Replay activation");
    expect(html).toContain("Watch the ceremony again");
    expect(html).toContain('class="replay-activation__emblem"');
    expect(html).toContain('class="replay-activation__arrow"');
    expect(html.match(/<button/gu)).toHaveLength(1);
    expect(button.props.ref).toBe(buttonRef);

    button.props.onClick();
    expect(onReplay).toHaveBeenCalledOnce();
  });
});
