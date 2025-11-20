import { BuildModal } from "@/components/BuildModal";
import { BuildModalContext } from "@/components/BuildModalContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { BuildDAO } from "@/data/BuildDAO";
import { useRef } from "react";

export function BuildModalProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { openNew, close, cmdRef } = useBuildModalCmd();
  return (
    <BuildModalContext.Provider value={{ openNew, close }}>
      {children}
      <BuildModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
    </BuildModalContext.Provider>
  );
}
export function useBuildModalCmd() {
  const cmdRef = useRef<{
    openNew: () => Promise<void>;
    openEdit: (build: BuildDAO) => void;
    close: () => void;
  }>({
    openNew: async () => {},
    openEdit: (_build: BuildDAO) => {},
    close: () => {},
  });

  return {
    ...cmdRef.current,
    cmdRef,
  };
}
