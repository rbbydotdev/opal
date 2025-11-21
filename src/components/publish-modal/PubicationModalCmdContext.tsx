import { BuildDAO } from "@/data/BuildDAO";
import { createContext, useContext } from "react";

export type BuildPublisherCmd = {
  open: (options: { build: BuildDAO }) => void;
  close: () => void;
  openDestinationFlow: (options: { destinationId: string }) => void;
};
export function useBuildPublisher() {
  return useContext(BuildPublisherContext);
}
export const BuildPublisherContext = createContext<BuildPublisherCmd>({
  open: () => {},
  close: () => {},
  openDestinationFlow: () => {},
});
