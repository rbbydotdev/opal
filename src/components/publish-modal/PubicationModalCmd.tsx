import { PubicationModalCmd, PublicationModalContext } from "@/components/publish-modal/PubicationModalCmdContext";
import { PublishModal } from "@/components/publish-modal/PublishModal";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { ReactNode, useRef } from "react";

export const PublicationModalProvider = ({ children }: { children: ReactNode }) => {
  const cmdRef = useRef<PubicationModalCmd>({
    open: () => {},
    close: () => {},
  });
  const { currentWorkspace } = useWorkspaceContext();
  return (
    <PublicationModalContext.Provider value={cmdRef.current}>
      <PublishModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
      {children}
    </PublicationModalContext.Provider>
  );
};
