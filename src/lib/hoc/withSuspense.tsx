import React, { ComponentType, ReactNode, Suspense } from "react";

export function withSuspense<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback: ReactNode = null
): React.FC<P> {
  return function SuspendedComponent(props: P) {
    return (
      <Suspense fallback={fallback}>
        <WrappedComponent {...props} />
      </Suspense>
    );
  };
}
