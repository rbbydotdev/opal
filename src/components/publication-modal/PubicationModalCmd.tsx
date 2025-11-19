import { PublicationModal } from "@/components/publication-modal/PublicationModal";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { BuildDAO } from "@/data/BuildDAO";
import { createContext, ReactNode, useContext, useRef } from "react";

type PubicationModalCmd = {
  open: ({ build }: { build: BuildDAO }) => void;
  close: () => void;
};
export function usePublicationModalCmd() {
  return useContext(PublicationModalContext);
}
export const PublicationModalContext = createContext<PubicationModalCmd>({
  open: () => {},
  close: () => {},
});

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
