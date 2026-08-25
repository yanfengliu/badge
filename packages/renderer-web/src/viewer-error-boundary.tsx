import { Component, type ReactNode } from "react";

interface ViewerErrorBoundaryProps {
  children: ReactNode;
  onError: (reason: string) => void;
}

export class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(`Live 3D could not render this badge: ${error.message}`);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
