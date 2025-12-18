import { PublishViewType } from "@/components/publish-modal/PublishModalStack";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { createContext, useContext } from "react";

export type BuildPublisherCmd = {
  open: ({ build }: { build: BuildDAO }) => void;
  close: () => void;
  openDestinationFlow: (destinationId?: string | null, view?: PublishViewType) => void;
  openDeployment: (deployId: string) => void;
};
export function useBuildPublisher() {
  return useContext(BuildPublisherContext);
}
export const BuildPublisherContext = createContext<BuildPublisherCmd>({
  open: () => {},
  close: () => {},
  openDestinationFlow: () => {},
  openDeployment: () => {},
});
