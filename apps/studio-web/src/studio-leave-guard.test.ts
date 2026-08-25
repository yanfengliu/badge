// @vitest-environment happy-dom

import { act, createElement, useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_RENDER_RECIPE } from "@badge/render-recipe";
import { describe, expect, it, vi } from "vitest";

import { initialCandidates } from "./studio-candidates.js";
import { prepareStudioLeave, useStudioLeaveGuard, type StudioLeaveGuard } from "./studio-leave-guard.js";
import type { StudioStore } from "./studio-store.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function requireValue<T>(read: () => T | null, label: string): T {
  const value = read();
  if (value === null) throw new Error(`${label} was not registered.`);
  return value;
}

describe("Studio leave guard", () => {
  it("blocks navigation while an owned operation is active", async () => {
    const saveDraft = vi.fn(async () => undefined);
    const onBlocked = vi.fn();

    await expect(
      prepareStudioLeave({ busy: "processing", saveDraft, onBlocked, onSaveError: vi.fn() }),
    ).resolves.toBe(false);
    expect(saveDraft).not.toHaveBeenCalled();
    expect(onBlocked).toHaveBeenCalledWith(expect.stringContaining("processing"));
  });

  it("flushes the current draft before allowing the section to unmount", async () => {
    const saveDraft = vi.fn(async () => undefined);

    await expect(
      prepareStudioLeave({ busy: null, saveDraft, onBlocked: vi.fn(), onSaveError: vi.fn() }),
    ).resolves.toBe(true);
    expect(saveDraft).toHaveBeenCalledOnce();
  });

  it("keeps Studio mounted when the final draft cannot be saved", async () => {
    const error = new Error("draft transaction failed");
    const onSaveError = vi.fn();

    await expect(
      prepareStudioLeave({
        busy: null,
        saveDraft: async () => Promise.reject(error),
        onBlocked: vi.fn(),
        onSaveError,
      }),
    ).resolves.toBe(false);
    expect(onSaveError).toHaveBeenCalledWith(error);
  });

  it("flushes the latest committed recipe even before passive guard registration runs", async () => {
    const saveDraft = vi.fn(async () => undefined);
    const store = { saveDraft } as unknown as StudioStore;
    let registeredGuard: StudioLeaveGuard | null = null;
    let leave: Promise<boolean> | null = null;

    function Harness({ borderColor, invoke }: { borderColor: string; invoke: boolean }) {
      const storeRef = useRef<StudioStore | null>(store);
      useStudioLeaveGuard({
        autosave: true,
        busy: null,
        onBlocked: vi.fn(),
        onGuardChange: (guard) => {
          registeredGuard = guard;
        },
        onSaveError: vi.fn(),
        recipe: { ...DEFAULT_RENDER_RECIPE, borderColor },
        selected: initialCandidates[0],
        store: storeRef,
        storeReady: true,
      });
      useLayoutEffect(() => {
        if (invoke) leave = registeredGuard?.() ?? null;
      }, [invoke]);
      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(createElement(Harness, { borderColor: "#b87333", invoke: false })));
    await act(async () => root.render(createElement(Harness, { borderColor: "#123456", invoke: true })));

    await expect(leave).resolves.toBe(true);
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ renderRecipe: expect.objectContaining({ borderColor: "#123456" }) }),
    );
    await act(async () => root.unmount());
    container.remove();
  });

  it("marks the draft dirty immediately and coalesces rapid edits into one autosave", async () => {
    vi.useFakeTimers();
    const saveDraft = vi.fn(async () => undefined);
    const store = { saveDraft } as unknown as StudioStore;

    function Harness({ borderColor }: { borderColor: string }) {
      const storeRef = useRef<StudioStore | null>(store);
      useStudioLeaveGuard({
        autosave: true,
        busy: null,
        onBlocked: vi.fn(),
        onGuardChange: vi.fn(),
        onSaveError: vi.fn(),
        recipe: { ...DEFAULT_RENDER_RECIPE, borderColor },
        selected: initialCandidates[0],
        store: storeRef,
        storeReady: true,
      });
      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(Harness, { borderColor: "#111111" })));
      await act(async () => root.render(createElement(Harness, { borderColor: "#222222" })));
      await act(async () => root.render(createElement(Harness, { borderColor: "#333333" })));
      const dirtyUnload = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
      expect(window.dispatchEvent(dirtyUnload)).toBe(false);
      expect(saveDraft).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(179);
        await Promise.resolve();
      });
      expect(saveDraft).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(1);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(saveDraft).toHaveBeenCalledOnce();
      expect(saveDraft).toHaveBeenCalledWith(
        expect.objectContaining({ renderRecipe: expect.objectContaining({ borderColor: "#333333" }) }),
      );
      const cleanUnload = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
      expect(window.dispatchEvent(cleanUnload)).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.useRealTimers();
    }
  });

  it("drains an older deferred save before writing the exact latest leave recipe", async () => {
    vi.useFakeTimers();
    let finishFirstSave: (() => void) | null = null;
    let finishFinalSave: (() => void) | null = null;
    const savedDraft = {} as Awaited<ReturnType<StudioStore["saveDraft"]>>;
    const saveDraft = vi
      .fn<StudioStore["saveDraft"]>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirstSave = () => resolve(savedDraft);
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFinalSave = () => resolve(savedDraft);
          }),
      );
    const store = { saveDraft } as unknown as StudioStore;
    let registeredGuard: StudioLeaveGuard | null = null;

    function Harness({ borderColor }: { borderColor: string }) {
      const storeRef = useRef<StudioStore | null>(store);
      useStudioLeaveGuard({
        autosave: true,
        busy: null,
        onBlocked: vi.fn(),
        onGuardChange: (guard) => {
          registeredGuard = guard;
        },
        onSaveError: vi.fn(),
        recipe: { ...DEFAULT_RENDER_RECIPE, borderColor },
        selected: initialCandidates[0],
        store: storeRef,
        storeReady: true,
      });
      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(Harness, { borderColor: "#111111" })));
      await act(async () => {
        vi.advanceTimersByTime(180);
        await Promise.resolve();
      });
      expect(saveDraft).toHaveBeenCalledOnce();

      await act(async () => root.render(createElement(Harness, { borderColor: "#222222" })));
      await act(async () => {
        vi.advanceTimersByTime(180);
        await Promise.resolve();
      });
      await act(async () => root.render(createElement(Harness, { borderColor: "#333333" })));
      let leaveAttempt: Promise<boolean> | null = null;
      await act(async () => {
        leaveAttempt = requireValue(() => registeredGuard, "leave guard")();
        await Promise.resolve();
      });
      expect(saveDraft).toHaveBeenCalledOnce();

      requireValue(() => finishFirstSave, "first deferred save")();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(saveDraft).toHaveBeenCalledTimes(2);
      expect(saveDraft.mock.calls.map(([draft]) => draft.renderRecipe.borderColor)).toEqual([
        "#111111",
        "#333333",
      ]);

      requireValue(() => finishFinalSave, "final deferred save")();
      await act(async () => {
        await leaveAttempt;
      });
      await expect(leaveAttempt).resolves.toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.useRealTimers();
    }
  });

  it("uses one in-flight leave flush and disables the mounted Studio controls until it settles", async () => {
    let finishSave: (() => void) | null = null;
    const saveDraft = vi.fn<StudioStore["saveDraft"]>().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = () => resolve({} as Awaited<ReturnType<StudioStore["saveDraft"]>>);
        }),
    );
    const store = { saveDraft } as unknown as StudioStore;
    let registeredGuard: StudioLeaveGuard | null = null;

    function Harness() {
      const storeRef = useRef<StudioStore | null>(store);
      const leaving = useStudioLeaveGuard({
        autosave: true,
        busy: null,
        onBlocked: vi.fn(),
        onGuardChange: (guard) => {
          registeredGuard = guard;
        },
        onSaveError: vi.fn(),
        recipe: DEFAULT_RENDER_RECIPE,
        selected: initialCandidates[0],
        store: storeRef,
        storeReady: true,
      });
      return createElement("button", { disabled: leaving }, "Edit recipe");
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(createElement(Harness)));
    let firstAttempt: Promise<boolean> | null = null;
    await act(async () => {
      firstAttempt = requireValue(() => registeredGuard, "leave guard")();
      await Promise.resolve();
    });
    expect((container.querySelector("button") as HTMLButtonElement).disabled).toBe(true);
    expect(requireValue(() => registeredGuard, "leave guard")()).toBe(firstAttempt);
    const pendingUnload = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    expect(window.dispatchEvent(pendingUnload)).toBe(false);

    requireValue(() => finishSave, "deferred save")();
    await act(async () => {
      await firstAttempt;
    });
    expect(await firstAttempt).toBe(true);
    expect((container.querySelector("button") as HTMLButtonElement).disabled).toBe(false);
    expect(saveDraft).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
    container.remove();
  });

  it("allows a clean saved draft to leave after a later store connection loss", async () => {
    vi.useFakeTimers();
    const saveDraft = vi.fn(async () => undefined);
    const storeRef: { current: StudioStore | null } = {
      current: { saveDraft } as unknown as StudioStore,
    };
    let registeredGuard: StudioLeaveGuard | null = null;

    function Harness({ storeReady }: { storeReady: boolean }) {
      useStudioLeaveGuard({
        autosave: true,
        busy: null,
        onBlocked: vi.fn(),
        onGuardChange: (guard) => {
          registeredGuard = guard;
        },
        onSaveError: vi.fn(),
        recipe: DEFAULT_RENDER_RECIPE,
        selected: initialCandidates[0],
        store: storeRef,
        storeReady,
      });
      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(createElement(Harness, { storeReady: true })));
      await act(async () => {
        vi.advanceTimersByTime(180);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(saveDraft).toHaveBeenCalledOnce();

      storeRef.current = null;
      await act(async () => root.render(createElement(Harness, { storeReady: false })));
      const cleanUnload = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
      expect(window.dispatchEvent(cleanUnload)).toBe(true);
      expect(cleanUnload.defaultPrevented).toBe(false);
      let leaveAllowed = false;
      await act(async () => {
        leaveAllowed = await requireValue(() => registeredGuard, "leave guard")();
      });
      expect(leaveAllowed).toBe(true);
      expect(saveDraft).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.useRealTimers();
    }
  });

  it("latches a failed required save after storage closes and protects browser unload", async () => {
    const saveError = new Error("draft transaction failed");
    const saveDraft = vi.fn<StudioStore["saveDraft"]>().mockRejectedValueOnce(saveError);
    const storeRef = { current: { saveDraft } as unknown as StudioStore };
    const onBlocked = vi.fn();
    const onSaveError = vi.fn(() => {
      storeRef.current = null as unknown as StudioStore;
    });
    let registeredGuard: StudioLeaveGuard | null = null;

    function Harness({ storeReady }: { storeReady: boolean }) {
      useStudioLeaveGuard({
        autosave: true,
        busy: null,
        onBlocked,
        onGuardChange: (guard) => {
          registeredGuard = guard;
        },
        onSaveError,
        recipe: DEFAULT_RENDER_RECIPE,
        selected: initialCandidates[0],
        store: storeRef,
        storeReady,
      });
      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(createElement(Harness, { storeReady: true })));
    let firstResult = true;
    await act(async () => {
      firstResult = await registeredGuard!();
    });
    expect(firstResult).toBe(false);
    expect(onSaveError).toHaveBeenCalledWith(saveError);

    await act(async () => root.render(createElement(Harness, { storeReady: false })));
    let secondResult = true;
    await act(async () => {
      secondResult = await registeredGuard!();
    });
    expect(secondResult).toBe(false);
    expect(saveDraft).toHaveBeenCalledOnce();
    expect(onBlocked).toHaveBeenCalledWith(expect.stringContaining("stay open"));

    const beforeUnload = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    expect(window.dispatchEvent(beforeUnload)).toBe(false);
    expect(beforeUnload.defaultPrevented).toBe(true);
    await act(async () => root.unmount());
    container.remove();
  });

  it("allows leaving the initial not-ready screen before any draft became editable", async () => {
    let registeredGuard: StudioLeaveGuard | null = null;

    function Harness() {
      const storeRef = useRef<StudioStore | null>(null);
      useStudioLeaveGuard({
        autosave: true,
        busy: null,
        onBlocked: vi.fn(),
        onGuardChange: (guard) => {
          registeredGuard = guard;
        },
        onSaveError: vi.fn(),
        recipe: DEFAULT_RENDER_RECIPE,
        selected: initialCandidates[0],
        store: storeRef,
        storeReady: false,
      });
      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(createElement(Harness)));
    await expect(requireValue(() => registeredGuard, "leave guard")()).resolves.toBe(true);
    await act(async () => root.unmount());
    container.remove();
  });
});
