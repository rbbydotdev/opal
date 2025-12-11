import { ScrollEventsConts } from "@/features/live-preview/ScrollEventsConts";
import { SuperEmitter } from "@/lib/events/TypeEmitter";
import { createContext, useContext } from "react";

export const ScrollSyncContext = createContext<{
  emitter: SuperEmitter<ScrollEventPayload>;
  toggle: (enabled: boolean) => void;
  enabled: boolean;
}>({
  emitter: {} as SuperEmitter<ScrollEventPayload>,
  toggle: () => {},
  enabled: false,
});
export type ScrollEventPayload = {
  [ScrollEventsConts.SCROLL]: { x: number; y: number; scrollId: string; originId: string };
};

export function useScrollSyncContext() {
  const context = useContext(ScrollSyncContext);
  return context;
}
