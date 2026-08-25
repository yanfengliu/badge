// @vitest-environment happy-dom

import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useModalFocus } from "./use-modal-focus.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function FocusModal({ name, onClose }: { readonly name: string; readonly onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<HTMLButtonElement>(null);
  useModalFocus(dialog, initialFocus, onClose);
  return (
    <div ref={dialog} role="dialog" data-focus-modal={name} tabIndex={-1}>
      <button ref={initialFocus} type="button">
        Close {name}
      </button>
    </div>
  );
}

function StackedFocusHarness({
  firstClosed,
  secondClosed,
}: {
  firstClosed: () => void;
  secondClosed: () => void;
}) {
  const [depth, setDepth] = useState(2);
  return (
    <>
      {depth >= 1 ? (
        <FocusModal
          name="first"
          onClose={() => {
            firstClosed();
            setDepth(0);
          }}
        />
      ) : null}
      {depth >= 2 ? (
        <FocusModal
          name="second"
          onClose={() => {
            secondClosed();
            setDepth(1);
          }}
        />
      ) : null}
    </>
  );
}

describe("nested modal focus", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.replaceChildren(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.replaceChildren();
  });

  it("lets only the top modal consume Escape and hands focus back down the stack", async () => {
    const firstClosed = vi.fn();
    const secondClosed = vi.fn();
    await act(async () =>
      root.render(<StackedFocusHarness firstClosed={firstClosed} secondClosed={secondClosed} />),
    );

    expect((document.activeElement as HTMLElement).textContent).toBe("Close second");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(secondClosed).toHaveBeenCalledTimes(1);
    expect(firstClosed).not.toHaveBeenCalled();
    expect(container.querySelector('[data-focus-modal="second"]')).toBeNull();
    expect((document.activeElement as HTMLElement).textContent).toBe("Close first");

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(firstClosed).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-focus-modal="first"]')).toBeNull();
  });
});
