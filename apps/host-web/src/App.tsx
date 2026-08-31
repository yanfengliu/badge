import { Activity, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { archiveSectionButtonId } from "../../archive-web/src/archive-section-focus";
import {
  badgeHistoryIndex,
  ensureBadgeHistoryIndex,
  notifyArchiveSectionLocation,
  observeArchiveSectionWrites,
} from "../../archive-web/src/archive-section-location";
import type { StudioLeaveGuard } from "../../studio-web/src/studio-leave-guard";
import {
  hostDestinationFromHash,
  pushUnindexedHostDestination,
  traverseToHostHistoryIndex,
  writeHostDestination,
  type HostDestination,
} from "./host-location";
import { SurfaceLoadBoundary } from "./SurfaceLoadBoundary";

type HostSurface = "archive" | "studio";

const ArchiveSurface = lazy(async () => {
  const module = await import("../../archive-web/src/ArchiveSurface");
  return { default: module.ArchiveSurface };
});

const StudioSurface = lazy(async () => {
  const module = await import("../../studio-web/src/StudioSurface");
  return { default: module.StudioSurface };
});

function HostSurfaceLoading({ surface }: { readonly surface: HostSurface }) {
  const name = surface === "studio" ? "Badge Studio" : "Badge Archive";
  return (
    <main className={`host-loading host-loading--${surface}`} aria-busy="true">
      <div className="host-loading__mark" aria-hidden="true" />
      <p className="host-loading__eyebrow">{name}</p>
      <p className="host-loading__status" role="status">
        Opening your {surface === "studio" ? "workspace" : "collection"}…
      </p>
    </main>
  );
}

function surfaceForDestination(destination: HostDestination): HostSurface {
  return destination === "studio" ? "studio" : "archive";
}

function focusDestination(destination: HostDestination): boolean {
  const id = destination === "studio" ? "studio-section-studio" : archiveSectionButtonId(destination);
  const target = document.getElementById(id);
  if (!target || target.closest("[hidden], [inert]")) return false;
  target.focus();
  return document.activeElement === target;
}

function updateDocumentSurface(surface: HostSurface): void {
  document.documentElement.dataset.badgeMode = surface;
  document.body.dataset.badgeMode = surface;
  document.title = surface === "studio" ? "Badge Studio" : "Badge Archive";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", surface === "studio" ? "#1d1d1a" : "#f1ede3");
}

export function App() {
  const initialDestination = hostDestinationFromHash(window.location.hash);
  const [surface, setSurface] = useState<HostSurface>(() => surfaceForDestination(initialDestination));
  const [mountedSurfaces, setMountedSurfaces] = useState(() => ({
    archive: surfaceForDestination(initialDestination) === "archive",
    studio: surfaceForDestination(initialDestination) === "studio",
  }));
  const [initialHistoryIndex] = useState(() => ensureBadgeHistoryIndex());
  const surfaceRef = useRef(surface);
  const mountedSurfacesRef = useRef(mountedSurfaces);
  const lastArchiveDestination = useRef<Exclude<HostDestination, "studio"> | null>(
    initialDestination === "studio" ? null : initialDestination,
  );
  const committedHistoryIndex = useRef<number | null>(initialHistoryIndex);
  const studioLeaveGuard = useRef<StudioLeaveGuard | null>(null);
  const transitionRevision = useRef(0);
  const observedLocation = useRef(window.location.href);
  const focusCleanup = useRef<(() => void) | null>(null);
  const pendingArchiveSynchronization = useRef<Exclude<HostDestination, "studio"> | null>(null);

  useLayoutEffect(() => updateDocumentSurface(surface), [surface]);

  useLayoutEffect(() => {
    const destination = pendingArchiveSynchronization.current;
    if (surface !== "archive" || destination === null) return;
    pendingArchiveSynchronization.current = null;
    notifyArchiveSectionLocation(destination);
  }, [surface]);

  const requestFocus = useCallback((destination: HostDestination) => {
    focusCleanup.current?.();
    focusCleanup.current = null;
    if (focusDestination(destination)) return;
    const root = document.getElementById("root") ?? document.body;
    const observer = new MutationObserver(() => {
      if (focusDestination(destination)) focusCleanup.current?.();
    });
    const frame = window.requestAnimationFrame(() => {
      if (focusDestination(destination)) focusCleanup.current?.();
    });
    const timeout = window.setTimeout(() => focusCleanup.current?.(), 5_000);
    const cleanup = () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      if (focusCleanup.current === cleanup) focusCleanup.current = null;
    };
    focusCleanup.current = cleanup;
    observer.observe(root, {
      attributeFilter: ["hidden", "inert"],
      attributes: true,
      childList: true,
      subtree: true,
    });
  }, []);

  useEffect(() => () => focusCleanup.current?.(), []);

  useEffect(
    () =>
      observeArchiveSectionWrites((destination) => {
        lastArchiveDestination.current = destination;
      }),
    [],
  );

  const transition = useCallback(
    async (
      destination: HostDestination,
      historyMode: "push" | "already-changed",
      incomingHistoryIndex: number | null = null,
    ) => {
      const revision = ++transitionRevision.current;
      const nextSurface = surfaceForDestination(destination);
      if (surfaceRef.current === "archive" && destination === "studio") {
        const currentDestination = hostDestinationFromHash(window.location.hash);
        if (currentDestination !== "studio") lastArchiveDestination.current = currentDestination;
      }
      if (surfaceRef.current === "studio" && nextSurface === "archive") {
        const allowed = (await studioLeaveGuard.current?.()) ?? true;
        if (revision !== transitionRevision.current) return;
        if (!allowed) {
          if (historyMode === "already-changed") {
            if (
              incomingHistoryIndex === null ||
              committedHistoryIndex.current === null ||
              incomingHistoryIndex === committedHistoryIndex.current
            ) {
              pushUnindexedHostDestination("studio");
              committedHistoryIndex.current = null;
              observedLocation.current = window.location.href;
            } else {
              traverseToHostHistoryIndex(committedHistoryIndex.current, incomingHistoryIndex);
            }
          }
          requestFocus("studio");
          return;
        }
      }
      if (historyMode === "push") {
        const currentIndex = badgeHistoryIndex(window.history.state);
        if (currentIndex === null) pushUnindexedHostDestination(destination);
        else writeHostDestination(destination, "push", currentIndex);
        committedHistoryIndex.current = badgeHistoryIndex(window.history.state);
        observedLocation.current = window.location.href;
      } else {
        committedHistoryIndex.current = incomingHistoryIndex;
      }
      const archiveWasMounted = mountedSurfacesRef.current.archive;
      if (
        nextSurface === "archive" &&
        surfaceRef.current === "studio" &&
        archiveWasMounted &&
        lastArchiveDestination.current !== destination
      ) {
        pendingArchiveSynchronization.current = destination as Exclude<HostDestination, "studio">;
      }
      if (nextSurface === "archive") {
        lastArchiveDestination.current = destination as Exclude<HostDestination, "studio">;
      }
      if (!mountedSurfacesRef.current[nextSurface]) {
        mountedSurfacesRef.current = { ...mountedSurfacesRef.current, [nextSurface]: true };
      }
      setMountedSurfaces((current) => (current[nextSurface] ? current : { ...current, [nextSurface]: true }));
      if (surfaceRef.current !== nextSurface) {
        surfaceRef.current = nextSurface;
        setSurface(nextSurface);
      }
      requestFocus(destination);
    },
    [requestFocus],
  );

  useEffect(() => {
    const synchronize = () => {
      if (observedLocation.current === window.location.href) return;
      observedLocation.current = window.location.href;
      void transition(
        hostDestinationFromHash(window.location.hash),
        "already-changed",
        badgeHistoryIndex(window.history.state),
      );
    };
    window.addEventListener("hashchange", synchronize);
    window.addEventListener("popstate", synchronize);
    return () => {
      window.removeEventListener("hashchange", synchronize);
      window.removeEventListener("popstate", synchronize);
    };
  }, [transition]);

  const registerStudioLeaveGuard = useCallback((guard: StudioLeaveGuard | null) => {
    studioLeaveGuard.current = guard;
  }, []);

  return (
    <>
      {mountedSurfaces.archive ? (
        <Activity mode={surface === "archive" ? "visible" : "hidden"}>
          <div
            data-host-surface="archive"
            hidden={surface !== "archive"}
            inert={surface !== "archive" ? true : undefined}
          >
            <SurfaceLoadBoundary surface="archive">
              <Suspense fallback={<HostSurfaceLoading surface="archive" />}>
                <ArchiveSurface onShowStudio={() => void transition("studio", "push")} />
              </Suspense>
            </SurfaceLoadBoundary>
          </div>
        </Activity>
      ) : null}
      {mountedSurfaces.studio ? (
        <div
          data-host-surface="studio"
          hidden={surface !== "studio"}
          inert={surface !== "studio" ? true : undefined}
        >
          <SurfaceLoadBoundary surface="studio">
            <Suspense fallback={<HostSurfaceLoading surface="studio" />}>
              <StudioSurface
                onSectionChange={(section) => void transition(section, "push")}
                onLeaveGuardChange={registerStudioLeaveGuard}
              />
            </Suspense>
          </SurfaceLoadBoundary>
        </div>
      ) : null}
    </>
  );
}
