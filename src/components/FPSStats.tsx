import React, { Suspense, lazy } from "react";

//@ts-expect-error :TS7016
const FPSStatsComponent = lazy(() => import("react-fps-stats"));

export function FPSStats() {
  if (import.meta.env.PROD) return null;
  return (
    <Suspense fallback={null}>
      <FPSStatsComponent />
    </Suspense>
  );
}
