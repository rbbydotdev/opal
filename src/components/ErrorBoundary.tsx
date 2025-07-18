import React from "react";

interface ErrorBoundaryProps {
  fallback: React.ComponentType<{ error?: Error | null }> | React.ReactNode;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error) {
    // Call onError only once per error
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      if (typeof Fallback === "function") {
        return <Fallback error={this.state.error} />;
      } else if (React.isValidElement(Fallback)) {
        return Fallback;
      } else {
        return null;
      }
    }
    return this.props.children;
  }
}
