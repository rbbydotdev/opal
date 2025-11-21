import { DestinationModal } from "@/components/publish-modal/DestinationModal";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { createContext, useContext, useRef } from "react";

type DestinationManagerContextType = {
  openDestinationFlow: (options: { destinationId: string }) => void;
  close: () => void;
};

const DestinationManagerContext = createContext<DestinationManagerContextType | null>(null);

export function DestinationManagerProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceContext();
  const cmdRef = useRef<{
    openDestinationFlow: (options: { destinationId: string }) => void;
    close: () => void;
  }>({
    openDestinationFlow: () => {},
    close: () => {},
  });

  const value: DestinationManagerContextType = {
    openDestinationFlow: (options) => cmdRef.current.openDestinationFlow(options),
    close: () => cmdRef.current.close(),
  };

  return (
    <DestinationManagerContext.Provider value={value}>
      {children}
      <DestinationModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
    </DestinationManagerContext.Provider>
  );
}

export function useDestinationManager() {
  const context = useContext(DestinationManagerContext);
  if (!context) {
    throw new Error("useDestinationManager must be used within DestinationManagerProvider");
  }
  return context;
}