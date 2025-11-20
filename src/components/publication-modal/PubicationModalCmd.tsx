import { PubicationModalCmd, PublicationModalContext } from "@/components/publication-modal/PubicationModalCmdContext";
import { PublicationModal } from "@/components/publication-modal/PublicationModal";
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
      <PublicationModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
      {children}
    </PublicationModalContext.Provider>
  );
};
