import { BuildPublisherCmd, BuildPublisherContext } from "@/components/publish-modal/PubicationModalCmdContext";
import { PublishModalStack } from "@/components/publish-modal/PublishModalStack";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { ReactNode, useRef } from "react";

export const PublicationModalProvider = ({ children }: { children: ReactNode }) => {
  const cmdRef = useRef<BuildPublisherCmd>({
    open: () => {},
    close: () => {},
    openDestinationFlow: () => {},
  });
  const { currentWorkspace } = useWorkspaceContext();
  return (
    <BuildPublisherContext.Provider value={cmdRef.current}>
      <PublishModalStack cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
      {children}
    </BuildPublisherContext.Provider>
  );
};
