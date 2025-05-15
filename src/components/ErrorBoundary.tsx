import React from "react";

// Error boundaries currently have to be classes.
interface ErrorBoundaryProps {
  fallback: React.ReactNode;
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
      return this.props.fallback;
    }
    return this.props.children;
  }
}
