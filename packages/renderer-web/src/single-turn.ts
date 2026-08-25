import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

import { INITIAL_VIEWER_STATE, type ViewerState } from "./viewer-state";

export const SINGLE_TURN_DURATION_MS = 2_400;

export type SingleTurnState = "inactive" | "waiting" | "running" | "complete" | "reduced-motion" | "static";

interface SingleTurnOptions {
  enabled: boolean;
  fallback: boolean;
  ready: boolean;
  reducedMotion: boolean;
  sessionIdentity: string;
  setView: Dispatch<SetStateAction<ViewerState>>;
}

interface SingleTurnAnimation {
  runIdentity: string;
  state: "running" | "complete";
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const reducedMotionSnapshot = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const serverReducedMotionSnapshot = () => false;

export function singleTurnYawAtElapsed(startYaw: number, elapsedMs: number): number {
  const progress = clamp(elapsedMs / SINGLE_TURN_DURATION_MS, 0, 1);
  const easedProgress = progress * progress * (3 - 2 * progress);
  return startYaw + Math.PI * 2 * easedProgress;
}

export function useReducedMotion(onReduce?: () => void): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const query = window.matchMedia(REDUCED_MOTION_QUERY);
      const update = () => {
        if (query.matches) onReduce?.();
        notify();
      };
      query.addEventListener("change", update);
      if (query.matches) onReduce?.();
      return () => query.removeEventListener("change", update);
    },
    [onReduce],
  );
  return useSyncExternalStore(subscribe, reducedMotionSnapshot, serverReducedMotionSnapshot);
}

export function useSingleTurn({
  enabled,
  fallback,
  ready,
  reducedMotion,
  sessionIdentity,
  setView,
}: SingleTurnOptions): SingleTurnState {
  const [animation, setAnimation] = useState<SingleTurnAnimation | null>(null);

  useEffect(() => {
    if (!enabled || fallback || reducedMotion || !ready) return;

    let frameId: number | null = null;
    let startedAt: number | null = null;

    const turn = (timestamp: number) => {
      startedAt ??= timestamp;
      setAnimation({ runIdentity: sessionIdentity, state: "running" });
      const elapsed = timestamp - startedAt;
      setView((current) => ({
        ...current,
        yaw: singleTurnYawAtElapsed(INITIAL_VIEWER_STATE.yaw, elapsed),
      }));
      if (elapsed >= SINGLE_TURN_DURATION_MS) {
        setAnimation({ runIdentity: sessionIdentity, state: "complete" });
        frameId = null;
        return;
      }
      frameId = window.requestAnimationFrame(turn);
    };

    frameId = window.requestAnimationFrame(turn);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [enabled, fallback, ready, reducedMotion, sessionIdentity, setView]);

  if (!enabled) return "inactive";
  if (fallback) return "static";
  if (reducedMotion) return "reduced-motion";
  if (!ready) return "waiting";
  return animation?.runIdentity === sessionIdentity ? animation.state : "waiting";
}
