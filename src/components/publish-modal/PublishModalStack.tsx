import { ConnectionsModalContent } from "@/components/connections-modal/ConnectionsModal";
import { BuildPublisherCmd } from "@/components/publish-modal/PubicationModalCmdContext";
import { PublicationModalDestinationContent } from "@/components/publish-modal/PublicationModalDestinationContent";
import { PublicationModalPublishContent } from "@/components/publish-modal/PublicationModalPublishContent";
import { useRemoteAuths } from "@/components/remote-auth/useRemoteAuths";
import { Case, SwitchCase } from "@/components/SwitchCase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuildDAO, NULL_BUILD } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { AnyDestinationMetaType, DestinationDAO } from "@/data/dao/DestinationDAO";
import { isRemoteAuthJType, PartialRemoteAuthJType, RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { cn } from "@/lib/utils";
import { Workspace } from "@/workspace/Workspace";
import { ArrowLeft, ArrowUpRight, Globe, Zap } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useState } from "react";

export type PublishViewType = "publish" | "destination" | "connection";

export function useViewStack<T extends string = PublishViewType>(defaultView: T, onEmpty?: () => void) {
  const [viewStack, setViewStack] = useState<T[]>([defaultView]);

  const currentView = viewStack[viewStack.length - 1];

  const pushView = (view: T) => {
    setViewStack((prev) => [...prev, view]);
  };

  const popView = () => {
    viewStack.pop();
    setViewStack([...viewStack]);
    if (viewStack.length === 0) {
      onEmpty?.();
      setViewStack([defaultView]);
    }
  };

  const replaceView = (view: T) => {
    setViewStack((prev) => [...prev.slice(0, -1), view]);
  };

  const resetToDefault = () => {
    setViewStack([defaultView]);
  };

  return {
    currentView,
    pushView,
    replaceView,
    popView,
    resetToDefault,
    canGoBack: viewStack.length > 1,
  };
}

//MARK: Publication Modal
export function PublishModalStack({
  currentWorkspace,
  cmdRef,
}: {
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<BuildPublisherCmd>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [build, setBuild] = useState<BuildDAO>(NULL_BUILD);
  const { remoteAuths } = useRemoteAuths();
  const [destination, setDestination] = useState<DestinationDAO | null>(null);
  const [preferredConnection, setPreferredConnection] = useState<RemoteAuthJType | PartialRemoteAuthJType | null>(null);
  const [deploy, setDeploy] = useState<DeployDAO | null>(null);
  const handleSubmit = async ({ remoteAuthId, label, meta }: AnyDestinationMetaType) => {
    const remoteAuth = remoteAuths.find((ra) => ra.guid === remoteAuthId);
    if (!remoteAuth) throw new Error("RemoteAuth not found");
    const submitDest = await DestinationDAO.CreateOrUpdate({
      guid: destination?.guid,
      label,
      meta,
      remoteAuth,
    });
    setDestination(submitDest);
    popView();
  };

  useEffect(() => {
    if (!isOpen) {
      setIsOpen(false);
      setPreferredConnection(null);
      setDeploy(null);
    }
  }, [isOpen]);

  const { currentView, pushView, replaceView, popView, resetToDefault, canGoBack } =
    useViewStack<PublishViewType>("publish");

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
      popView();
    },
    [popView]
  );

  useImperativeHandle(
    cmdRef,
    () => ({
      open: ({ build }) => {
        setIsOpen(true);
        setBuild(build);
      },
      close: () => {
        setIsOpen(false);
      },
      openDeployment: async (deployId) => {
        const deploy = await DeployDAO.FetchModelFromGuidSafe(deployId);
        setBuild(deploy.Build);
        setDestination(deploy.Destination);
        setDeploy(deploy);
        replaceView("publish");
        setIsOpen(true);
      },
      openDestinationFlow: async (destinationId) => {
        if (destinationId) {
          const destination = await DestinationDAO.FetchDAOFromGuid(destinationId, true);
          setPreferredConnection(destination.remoteAuth);
          setDestination(destination);
        } else {
          setDestination(null);
          setPreferredConnection(null);
        }
        setBuild(NULL_BUILD); // Set a null build for destination-only mode
        setIsOpen(true);
        replaceView("destination");
      },
    }),
    [replaceView]
  );
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetToDefault(); // Always reset view when closing
      setPreferredConnection(null);
      setDestination(null);
      setBuild(NULL_BUILD);
    }
    setIsOpen(open);
  };

  const isEditConnection = isRemoteAuthJType(preferredConnection) && preferredConnection?.guid;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("overflow-y-auto top-[10vh] min-h-[50vh] max-w-2xl max-h-[85vh]", {
          "min-h-[80vh]": currentView === "publish",
          "top-[2vh] max-h-[95vh]": deploy?.completed,
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
          <div className="text-sm text-muted-foreground flex flex-col w-full">
            <SwitchCase>
              <Case condition={currentView === "publish"}>
                <div className="flex flex-col w-full">
                  <span className="font-bold text-lg text-foreground flex justify-start items-center gap-2">
                    <ArrowUpRight className="text-ring" />
                    Deploy
                  </span>
                  <span className="w-full flex justify-start">Deploy to selected destination</span>
                </div>
              </Case>
              <Case condition={currentView === "destination"}>
                <div className="flex flex-col w-full">
                  <span className="font-bold text-lg text-foreground flex justify-start items-center gap-2">
                    <Globe className="text-ring" />
                    Destination
                  </span>
                  <span className="w-full flex justify-start">Create Destination to deploy to</span>
                </div>
              </Case>
              <Case condition={currentView === "connection"}>
                <div className="flex flex-col w-full">
                  <span className="font-bold text-lg text-foreground flex justify-start items-center gap-2">
                    <Zap className="text-ring" />
                    Connection
                  </span>
                  <span className="w-full flex justify-start">Add or manage connections</span>
                </div>
              </Case>
            </SwitchCase>
          </div>
        </DialogHeader>

        {/* MARK: view dest*/}
        {currentView === "destination" && (
          <>
            <PublicationModalDestinationContent
              close={popView}
              handleSubmit={handleSubmit}
              remoteAuths={remoteAuths}
              defaultName={currentWorkspace.name}
              preferredConnection={preferredConnection}
              editDestination={destination}
              setPreferredConnection={setPreferredConnection}
              pushView={pushView}
            />
          </>
        )}
        {/* MARK: view conn */}
        {currentView === "connection" && (
          <ConnectionsModalContent
            connection={preferredConnection}
            mode={isEditConnection ? "edit" : "add"}
            onClose={() => {
              setPreferredConnection(null);
              popView();
            }}
            onSuccess={(remoteAuth) => {
              setPreferredConnection(remoteAuth);
              popView();
            }}
          >
            <DialogHeader>
              <DialogTitle>{isEditConnection ? "Edit connection" : "Add connection for publish target"}</DialogTitle>
            </DialogHeader>
          </ConnectionsModalContent>
        )}

        {/* MARK: view pub */}
        {currentView === "publish" && (
          <PublicationModalPublishContent
            //* for jumping to new connection
            setPreferredConnection={setPreferredConnection}
            pushView={pushView}
            //*
            destination={destination}
            deploy={deploy}
            setDestination={setDestination}
            currentWorkspace={currentWorkspace}
            onOpenChange={setIsOpen}
            setBuild={setBuild}
            build={build}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
