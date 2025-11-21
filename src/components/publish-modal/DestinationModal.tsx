import { ConnectionsModalContent } from "@/components/ConnectionsModal";
import { ModalShell } from "@/components/modals/ModalShell";
import { PublicationModalDestinationContent } from "@/components/publish-modal/PublicationModalDestinationContent";
import { PublishViewType, useViewStack } from "@/components/publish-modal/PublishModalStack";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Workspace } from "@/data/Workspace";
import { useDestinationFlow } from "@/hooks/useDestinationFlow";
import { Case, SwitchCase } from "@/lib/SwitchCase";
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

  return (
    <ModalShell
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      canGoBack={canGoBack}
      onBack={popView}
      contentClassName={currentView === "destination" ? "min-h-[80vh]" : undefined}
    >
      <SwitchCase>
        <Case condition={currentView === "destination"}>
          <DialogHeader>
            <DialogTitle>Destination</DialogTitle>
            <DialogDescription className="flex flex-col w-full">
              <span className="font-bold text-lg text-foreground">
                {destination?.label || "Manage Destination"}
              </span>
              View and edit destination configuration
            </DialogDescription>
          </DialogHeader>
          
          <PublicationModalDestinationContent
            close={handleClose}
            handleSubmit={handleSubmitAndClose}
            remoteAuths={remoteAuths}
            defaultName={currentWorkspace.name}
            preferredDestConnection={preferredDestConnection}
            editDestination={destination}
            onAddConnection={() => pushView("connection")}
          />
        </Case>
        
        <Case condition={currentView === "connection"}>
          <DialogHeader>
            <DialogTitle>Add Connection</DialogTitle>
            <DialogDescription>
              Connect to a hosting service
            </DialogDescription>
          </DialogHeader>
          
          <ConnectionsModalContent
            mode="add"
            onClose={() => popView()}
            onSuccess={(auth) => {
              setPreferredNewConnection({ type: auth.type, source: auth.source });
              popView();
            }}
          />
        </Case>
      </SwitchCase>
    </ModalShell>
  );
}