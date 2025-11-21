import { PublicationModalDestinationContent } from "@/components/publish-modal/PublicationModalDestinationContent";
import { PublishViewType, useViewStack } from "@/components/publish-modal/PublishModalStack";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuildDAO, NULL_BUILD } from "@/data/BuildDAO";
import { DestinationDAO, DestinationMetaType, DestinationType } from "@/data/DestinationDAO";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { Workspace } from "@/data/Workspace";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useCallback, useImperativeHandle, useState } from "react";

export function DestinationModal({
  currentWorkspace,
  cmdRef,
}: {
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    open: ({ build }: { build: BuildDAO }) => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [build, setBuild] = useState<BuildDAO>(NULL_BUILD);
  const { remoteAuths } = useRemoteAuths();
  const [destination, setDestination] = useState<DestinationDAO | null>(null);
  const { currentView, pushView, replaceView, popView, resetToDefault, canGoBack } =
    useViewStack<PublishViewType>("publish");

  const [preferredNewConnection, setPreferredNewConnection] = useState<Pick<
    RemoteAuthRecord,
    "type" | "source"
  > | null>(null);
  const [preferredDestConnection, setPreferredDestConnection] = useState<RemoteAuthRecord | null>(null);
  const handleSubmit = async ({ remoteAuthId, ...data }: DestinationMetaType<DestinationType>) => {
    const remoteAuth = remoteAuths.find((ra) => ra.guid === remoteAuthId);
    if (!remoteAuth) throw new Error("RemoteAuth not found");
    const destination = DestinationDAO.CreateNew({ ...data, remoteAuth });
    await destination.save();
    setDestination(destination);
    resetToDefault();
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setPreferredDestConnection(null);
    setPreferredNewConnection(null);
  }, []);

  const handlePointerDownOutside = useCallback(() => {
    if (currentView === "destination") {
      resetToDefault();
      setIsOpen(false);
    } else if (currentView === "connection") {
      popView();
    }
  }, [currentView, popView, resetToDefault]);

  const handleEscapeKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest(`[data-no-escape]`)) {
        return event.preventDefault();
      }
      event.preventDefault();
      if (canGoBack) return popView();
      if (currentView === "publish") return setIsOpen(false);
    },
    [canGoBack, currentView, popView]
  );

  useImperativeHandle(
    cmdRef,
    () => ({
      open: ({ build }) => {
        setIsOpen(true);
        setBuild(build);
      },
    }),
    []
  );
  const handleOpenChange = (open: boolean) => {
    if (!open) resetToDefault(); // Always reset view when closing
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("overflow-y-auto top-[10vh] min-h-[50vh] max-w-2xl", {
          "min-h-[80vh]": currentView === "publish",
        })}
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex gap-4 justify-start items-center mb-4 text-xl">
              {canGoBack && (
                <Button variant="outline" size="sm" title="back" onClick={popView}>
                  <ArrowLeft />
                  <div className="uppercase text-2xs">back</div>
                </Button>
              )}
              Publish
            </div>
          </DialogTitle>
          <DialogDescription className="flex flex-col w-full">
            <span className="font-bold text-lg text-foreground">Destination</span>
            Create Destination to deploy to
          </DialogDescription>
        </DialogHeader>

        <PublicationModalDestinationContent
          close={() => popView}
          handleSubmit={handleSubmit}
          remoteAuths={remoteAuths}
          defaultName={currentWorkspace.name}
          preferredDestConnection={preferredDestConnection}
          editDestination={destination}
          onAddConnection={() => pushView("connection")}
        />
      </DialogContent>
    </Dialog>
  );
}
