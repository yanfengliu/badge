import { Component, lazy, Suspense, type ReactNode } from "react";
import type { BadgeViewerProps } from "@badge/renderer-web";

const DeferredBadgeViewer = lazy(async () => {
  const module = await import("@badge/renderer-web");
  return { default: module.BadgeViewer };
});

interface BadgeViewerLoadBoundaryProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly onRetry?: () => void;
  readonly presentation: NonNullable<BadgeViewerProps["presentation"]>;
}

interface BadgeViewerLoadBoundaryState {
  readonly failed: boolean;
}

function reloadBadge() {
  window.location.reload();
}

function viewerClassName(className?: string): string {
  return ["badge-viewer", className].filter(Boolean).join(" ");
}

function DeferredBadgeSurface({
  children,
  className,
  presentation,
}: Pick<BadgeViewerLoadBoundaryProps, "children" | "className" | "presentation">) {
  return (
    <section className={viewerClassName(className)} data-presentation={presentation}>
      <div
        className={`badge-viewer__viewport badge-viewer__deferred${presentation === "single-turn" ? " badge-viewer__viewport--passive" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

export class BadgeViewerLoadBoundary extends Component<
  BadgeViewerLoadBoundaryProps,
  BadgeViewerLoadBoundaryState
> {
  state: BadgeViewerLoadBoundaryState = { failed: false };

  static getDerivedStateFromError(): BadgeViewerLoadBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <DeferredBadgeSurface className={this.props.className} presentation={this.props.presentation}>
        <div className="visual-load-failure" role="alert">
          <p>The badge presentation could not load. Reload Badge to try again.</p>
          <button className="secondary-button" type="button" onClick={this.props.onRetry ?? reloadBadge}>
            Reload Badge
          </button>
        </div>
      </DeferredBadgeSurface>
    );
  }
}

export function LazyBadgeViewer(props: BadgeViewerProps) {
  const presentation = props.presentation ?? "interactive";
  return (
    <BadgeViewerLoadBoundary className={props.className} presentation={presentation}>
      <Suspense
        fallback={
          <DeferredBadgeSurface className={props.className} presentation={presentation}>
            <p className="badge-viewer__deferred-message" role="status">
              Preparing the badge…
            </p>
          </DeferredBadgeSurface>
        }
      >
        <DeferredBadgeViewer {...props} />
      </Suspense>
    </BadgeViewerLoadBoundary>
  );
}
