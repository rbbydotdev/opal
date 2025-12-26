import { PublishViewType } from "@/components/publish-modal/PublishModalStack";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { createContext, useContext, useRef } from "react";

export type BuildPublisherCmd = {
  open: ({ build }: { build: BuildDAO }) => void;
  close: () => void;
  openDestinationFlow: (destinationId?: string | null, view?: PublishViewType) => void;
  openDeployment: (deployId: string) => void;
};
export function useBuildPublisher() {
  return useContext(BuildPublisherContext);
}
export const defaultBuildPublisherCmd: BuildPublisherCmd = {
  open: ({ build }: { build: BuildDAO }) => {},
  close: () => {},
  openDestinationFlow: (destinationId?: string | null, view?: PublishViewType) => {},
  openDeployment: (deployId: string) => {},
};
export const BuildPublisherContext = createContext<BuildPublisherCmd>(defaultBuildPublisherCmd);

// useRef<BuildPublisherCmd>(defaultBuildPublisherCmd)
export function useBuildPublisherCmdRef() {
  return useRef<BuildPublisherCmd>(defaultBuildPublisherCmd);
}
