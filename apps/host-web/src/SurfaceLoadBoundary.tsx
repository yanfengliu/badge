import { Component, type ReactNode } from "react";

interface SurfaceLoadBoundaryProps {
  readonly children: ReactNode;
  readonly onRetry?: () => void;
  readonly surface: "archive" | "studio";
}

interface SurfaceLoadBoundaryState {
  readonly failed: boolean;
}

function reloadBadge() {
  window.location.reload();
}

export class SurfaceLoadBoundary extends Component<SurfaceLoadBoundaryProps, SurfaceLoadBoundaryState> {
  state: SurfaceLoadBoundaryState = { failed: false };

  static getDerivedStateFromError(): SurfaceLoadBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const name = this.props.surface === "studio" ? "Badge Studio" : "Badge Archive";
    return (
      <main
        className={`host-loading host-loading--${this.props.surface} host-loading--error`}
        aria-busy="false"
      >
        <div className="host-loading__mark" aria-hidden="true" />
        <p className="host-loading__eyebrow">{name}</p>
        <p className="host-loading__status" role="alert">
          {name} could not open. Reload Badge to try again.
        </p>
        <button className="host-loading__retry" type="button" onClick={this.props.onRetry ?? reloadBadge}>
          Reload Badge
        </button>
      </main>
    );
  }
}
