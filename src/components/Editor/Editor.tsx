import React, { Suspense, lazy } from "react";
import { Loader } from "lucide-react";

// This is the only place InitializedMDXEditor is imported directly.
const InitializedMDXEditor = lazy(() => import("./InitializedMDXEditor"));

export const Editor = () => (
  <Suspense fallback={
    <div className="w-full h-full flex items-center justify-center animate-spin">
      <Loader />
    </div>
  }>
    <InitializedMDXEditor />
  </Suspense>
);
