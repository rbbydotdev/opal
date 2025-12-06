import { ScrollEventsConts } from "@/features/live-preview/ScrollEventsConts";
import { SuperEmitter } from "@/lib/events/TypeEmitter";
import { createContext, useContext } from "react";

export const ScrollSyncContext = createContext<{
  emitter: SuperEmitter<ScrollEventPayload>;
} | null>(null);
export type ScrollEventPayload = {
  [ScrollEventsConts.SCROLL]: { x: number; y: number; scrollId: string; originId: string };
};

export function useScrollSyncContext() {
  const context = useContext(ScrollSyncContext);
  return context;
}
