import React from "react";

interface ErrorBoundaryProps {
  fallback: React.ComponentType<{ error?: Error | null; reset?: () => void }> | React.ReactNode;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: number; // 👈 used to force re-mount children
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      resetKey: 0, // keep resetKey unchanged here
    };
  }

  componentDidCatch(error: Error) {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  // 👇 Reset method
  reset = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      resetKey: prev.resetKey + 1, // increment to force re-mount
    }));
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      if (typeof Fallback === "function") {
        return <Fallback error={this.state.error} reset={this.reset} />;
      } else if (React.isValidElement(Fallback)) {
        return Fallback;
      } else {
        return null;
      }
    }

    // 👇 use resetKey to force children to re-mount
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
