import { BuildPublisherContext, useBuildPublisherCmdRef } from "@/components/publish-modal/PubicationModalCmdContext";
import { PublishModalStack } from "@/components/publish-modal/PublishModalStack";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { ReactNode } from "react";

export const PublicationModalProvider = ({ children }: { children: ReactNode }) => {
  const cmdRef = useBuildPublisherCmdRef();
  const { currentWorkspace } = useWorkspaceContext();
  return (
    <BuildPublisherContext.Provider value={cmdRef.current}>
      <PublishModalStack cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
      {children}
    </BuildPublisherContext.Provider>
  );
};
