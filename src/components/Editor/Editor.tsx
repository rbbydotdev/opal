"use client";
// ForwardRefEditor.tsx
import { Loader } from "lucide-react";
import dynamic from "next/dynamic";

// This is the only place InitializedMDXEditor is imported directly.
export const Editor = dynamic(() => import("./InitializedMDXEditor"), {
  // Make sure we turn SSR off
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center animate-spin">
      <Loader />
    </div>
  ),
});
