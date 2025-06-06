import React from "react";

// Error boundaries currently have to be classes.
interface ErrorBoundaryProps {
  fallback: React.ComponentType<{ error?: Error | null }> | React.ReactNode;
  children?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return {
      hasError: true,
      error,
    };
  }
  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      if (typeof Fallback === "function") {
        return <Fallback error={this.state.error}></Fallback>;
      } else if (React.isValidElement(Fallback)) {
        return Fallback;
      } else {
        return null;
      }
    }
    return this.props.children;
  }
}
