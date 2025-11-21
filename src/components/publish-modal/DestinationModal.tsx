import { ConnectionsModalContent } from "@/components/ConnectionsModal";
import { ModalShell } from "@/components/modals/ModalShell";
import { PublicationModalDestinationContent } from "@/components/publish-modal/PublicationModalDestinationContent";
import { PublishViewType, useViewStack } from "@/components/publish-modal/PublishModalStack";
import { Workspace } from "@/data/Workspace";
import { useDestinationFlow } from "@/hooks/useDestinationFlow";
import { useCallback, useImperativeHandle, useState } from "react";

export type DestinationModalProps = {
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    openDestinationFlow: (options: { destinationId: string }) => void;
    close: () => void;
  }>;
};

export function DestinationModal({ currentWorkspace, cmdRef }: DestinationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentView, pushView, popView, resetToDefault, canGoBack } = useViewStack<PublishViewType>("destination");
  
  const {
    destination,
    preferredNewConnection,
    preferredDestConnection,
    remoteAuths,
    handleSubmit,
    loadDestination,
    updateDestination,
    reset,
    setPreferredNewConnection,
  } = useDestinationFlow();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetToDefault();
    reset();
  }, [resetToDefault, reset]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleClose();
    }
  }, [handleClose]);

  const handleSubmitAndClose = useCallback(async (data: any) => {
    await handleSubmit(data);
    resetToDefault();
  }, [handleSubmit, resetToDefault]);

  useImperativeHandle(
    cmdRef,
    () => ({
      openDestinationFlow: async ({ destinationId }) => {
        await loadDestination(destinationId);
        setIsOpen(true);
      },
      close: handleClose,
    }),
    [loadDestination, handleClose]
  );

  const getTitle = () => {
    return currentView === "connection" ? "Add Connection" : "Destination";
  };

  const getSubtitle = () => {
    if (currentView === "connection") return "Connect to Service";
    return destination?.label || "Manage Destination";
  };

  const getDescription = () => {
    if (currentView === "connection") return "Connect to a hosting service";
    return "View and edit destination configuration";
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={getTitle()}
      subtitle={getSubtitle()}
      description={getDescription()}
      canGoBack={canGoBack}
      onBack={popView}
      contentClassName={currentView === "destination" ? "min-h-[80vh]" : undefined}
    >
      {currentView === "destination" && (
        <PublicationModalDestinationContent
          close={handleClose}
          handleSubmit={handleSubmitAndClose}
          remoteAuths={remoteAuths}
          defaultName={currentWorkspace.name}
          preferredDestConnection={preferredDestConnection}
          editDestination={destination}
          onAddConnection={() => pushView("connection")}
        />
      )}
      
      {currentView === "connection" && (
        <ConnectionsModalContent
          mode="add"
          onClose={() => popView()}
          onSuccess={(auth) => {
            setPreferredNewConnection({ type: auth.type, source: auth.source });
            popView();
          }}
        />
      )}
    </ModalShell>
  );
}