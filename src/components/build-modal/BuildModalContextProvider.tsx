import { BuildModal } from "@/components/build-modal/BuildModal";
import { BuildCreationContext } from "@/components/build-modal/BuildModalContext";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { useRef } from "react";

export function BuildCreationProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { cmdRef } = useBuildCreationCmd();
  return (
    <BuildCreationContext.Provider value={{ ...cmdRef.current }}>
      {children}
      <BuildModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
    </BuildCreationContext.Provider>
  );
}
export function useBuildCreationCmd() {
  const cmdRef = useRef<{
    openNew: () => Promise<void>;
    openEdit: (options: { buildId: string }) => void;
    close: () => void;
  }>({
    openNew: async () => {},
    openEdit: (options: { buildId: string }) => {},
    close: () => {},
  });

  return {
    cmdRef,
  };
}
