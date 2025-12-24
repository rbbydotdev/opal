import { BuildModal } from "@/components/build-modal/BuildModal";
import { BuildCreationContext } from "@/components/build-modal/BuildModalContext";
import { BuildDAO, NULL_BUILD } from "@/data/dao/BuildDAO";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { useRef } from "react";

export function BuildCreationProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { cmdRef } = useBuildCreationCmd();
  const contextValue = {
    openNew: () => cmdRef.current.openNew(),
    openEdit: (options: { buildId: string }) => cmdRef.current.openEdit(options),
    close: () => cmdRef.current.close(),
  };
  return (
    <BuildCreationContext.Provider value={contextValue}>
      {children}
      <BuildModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
    </BuildCreationContext.Provider>
  );
}
export function useBuildCreationCmd() {
  const cmdRef = useRef<{
    openNew: () => BuildDAO;
    openEdit: (options: { buildId: string }) => void;
    close: () => void;
  }>({
    openNew: () => NULL_BUILD,
    openEdit: (options: { buildId: string }) => {},
    close: () => {},
  });

  return {
    cmdRef,
  };
}
