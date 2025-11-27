import { useBuildPublisher } from "@/components/publish-modal/PubicationModalCmdContext";
import { createContext, useContext } from "react";

type DestinationManagerContextType = {
  openDestinationFlow: (destinationId?: string | null) => void;
  close: () => void;
};

const DestinationManagerContext = createContext<DestinationManagerContextType | null>(null);

export function DestinationManagerProvider({ children }: { children: React.ReactNode }) {
  const buildPublisher = useBuildPublisher();

  const value: DestinationManagerContextType = {
    openDestinationFlow: (destinationId) => buildPublisher.openDestinationFlow(destinationId),
    close: () => buildPublisher.close(),
  };

  return <DestinationManagerContext.Provider value={value}>{children}</DestinationManagerContext.Provider>;
}

export function useDestinationManager() {
  const context = useContext(DestinationManagerContext);
  if (!context) {
    throw new Error("useDestinationManager must be used within DestinationManagerProvider");
  }
  return context;
}
