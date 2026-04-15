import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for individual view panels.
 * Shows a small inline error message without freezing the whole page or nav.
 */
class ViewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center pt-24 text-center">
          <p className="text-muted-foreground/60 text-sm mb-2">
            {this.props.viewName ?? "This view"} couldn't load
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ViewErrorBoundary;
