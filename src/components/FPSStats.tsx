"use client";
import dynamic from "next/dynamic";

//@ts-expect-error :TS7016
const FPSStatsComponent = dynamic(() => import("react-fps-stats"), { ssr: false });
export function FPSStats() {
  if (process.env.NODE_ENV === "production") return null;
  return <FPSStatsComponent />;
}
