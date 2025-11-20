import { BuildModal } from "@/components/BuildModal";
import { BuildModalContext } from "@/components/BuildModalContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useRef } from "react";

export function BuildModalProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { cmdRef } = useBuildModalCmd();
  return (
    <BuildModalContext.Provider value={{ ...cmdRef.current, close: () => {} }}>
      {children}
      <BuildModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
    </BuildModalContext.Provider>
  );
}
export function useBuildModalCmd() {
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
