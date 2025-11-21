import { ConnectionsModalContent } from "@/components/ConnectionsModal";
import { BuildInfo } from "@/components/publish-modal/BuildInfo";
import { BuildPublisherCmd } from "@/components/publish-modal/PubicationModalCmdContext";
import { PublicationModalDestinationContent } from "@/components/publish-modal/PublicationModalDestinationContent";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { RemoteAuthTemplates, typeSource } from "@/components/RemoteAuthTemplate";
import { BuildLabel } from "@/components/SidebarFileMenu/build-files-section/BuildLabel";
import { DestinationLabel } from "@/components/SidebarFileMenu/build-files-section/DestinationLabel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO, NULL_BUILD } from "@/data/BuildDAO";
import { BuildLogLine } from "@/data/BuildRecord";
import { DestinationDAO, DestinationMetaType, DestinationType } from "@/data/DestinationDAO";
import { RemoteAuthJType, RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { Workspace } from "@/data/Workspace";
import { BuildLog } from "@/hooks/useBuildLogs";
import { useDestinations } from "@/hooks/useDestinations";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { Case, SwitchCase } from "@/lib/SwitchCase";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader,
  Pencil,
  Plus,
  UploadCloud,
  UploadCloudIcon,
  Zap,
} from "lucide-react";
import { useCallback, useImperativeHandle, useState } from "react";
import { timeAgo } from "short-time-ago";

export type PublishViewType = "publish" | "destination" | "connection";

export function useViewStack<T extends string = PublishViewType>(defaultView: T) {
  const [viewStack, setViewStack] = useState<T[]>([defaultView]);

  const currentView = viewStack[viewStack.length - 1];

  const pushView = (view: T) => {
    setViewStack((prev) => [...prev, view]);
  };

  const popView = () => {
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
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
      close: () => {
        setIsOpen(false);
      },
      openDestinationFlow: async ({ destinationId }) => {
        const destination = await DestinationDAO.FetchDAOFromGuid(destinationId, true);
        setPreferredDestConnection(destination.remoteAuth);
        setDestination(destination);
        setBuild(NULL_BUILD); // Set a null build for destination-only mode
        setIsOpen(true);
        replaceView("destination");
      },
    }),
    [replaceView]
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
            <span className="font-bold text-lg text-foreground">
              <SwitchCase>
                <Case condition={currentView === "publish"}>Deploy</Case>
                <Case condition={currentView === "destination"}>Destination</Case>
                <Case condition={currentView === "connection"}>Connection</Case>
              </SwitchCase>
            </span>
            <SwitchCase>
              <Case condition={currentView === "publish"}>Deploy to selected destination</Case>
              <Case condition={currentView === "destination"}>Create Destination to deploy to</Case>
              <Case condition={currentView === "connection"}>Add or manage connections</Case>
            </SwitchCase>
          </DialogDescription>
        </DialogHeader>

        {/* MARK: view dest*/}
        {currentView === "destination" && (
          <>
            <PublicationModalDestinationContent
              close={() => {
                popView();
              }}
              handleSubmit={handleSubmit}
              remoteAuths={remoteAuths}
              defaultName={currentWorkspace.name}
              preferredDestConnection={preferredDestConnection}
              editDestination={destination}
              onAddConnection={() => pushView("connection")}
            />
          </>
        )}
        {/* MARK: view conn */}
        {currentView === "connection" && (
          <ConnectionsModalContent
            preferredNewConnection={preferredNewConnection}
            mode="add"
            onClose={popView}
            onSuccess={(remoteAuth) => {
              setPreferredDestConnection(remoteAuth);
              replaceView("destination");
            }}
          >
            <DialogHeader>
              <DialogTitle>Add connection for publish target</DialogTitle>
            </DialogHeader>
          </ConnectionsModalContent>
        )}

        {/* MARK: view pub */}
        {currentView === "publish" && (
          <PublicationModalPublishContent
            //* for jumping to new connection
            setPreferredNewConnection={setPreferredNewConnection}
            setPreferredDestConnection={setPreferredDestConnection}
            pushView={pushView}
            //*
            destination={destination}
            setDestination={setDestination}
            currentWorkspace={currentWorkspace}
            onOpenChange={setIsOpen}
            build={build}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

//MARK: Destination Content Modal View

//MARK: Publish Content
export function PublicationModalPublishContent({
  build,
  destination,
  onClose,
  onOpenChange,
  pushView,
  setDestination,
  setPreferredDestConnection,
  setPreferredNewConnection,
}: {
  build: BuildDAO;
  currentWorkspace: Workspace;
  destination: DestinationDAO | null;
  onClose?: () => void;
  onOpenChange: (value: boolean) => void;
  pushView: (view: PublishViewType) => void;
  setDestination: (destination: DestinationDAO) => void;
  // setEditDestination: (destination: DestinationDAO) => void;
  setPreferredDestConnection: (connection: RemoteAuthRecord) => void;
  setPreferredNewConnection: (connection: Pick<RemoteAuthJType, "type" | "source">) => void;
}) {
  const { remoteAuths } = useRemoteAuths();
  const { destinations } = useDestinations();

  const [publishError, setPublishError] = useState<string | null>(null);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const NO_REMOTES = remoteAuths.length === 0;

  const handleOkay = () => onOpenChange(false);
  const log = useCallback((bl: BuildLogLine) => {
    setLogs((prev) => [...prev, bl]);
  }, []);
  const handleBuild = async () => {
    if (!destination) return;
    setIsPublishing(true);
    setLogs([]);
    setPublishError(null);
    // try {
    //   await build.publish?.({
    //     destination,
    //     onLog: (line) => {
    //       log({ type: "info", message: line, timestamp: Date.now() });
    //     },
    //   });
    // } catch (error) {
    //   log({ type: "error", message: (error as Error).message, timestamp: Date.now() });
    //   setPublishError((error as Error).message);
    // } finally {
    //   setIsPublishing(false);
    // }
  };
  const handleSetDestination = (destId: string) => {
    const selectedRemoteAuth = remoteAuths.find((remoteAuth) => remoteAuth.guid === destId);
    const selectedDestination = destinations.find((d) => d.guid === destId);

    //determine which kind was selected
    if (selectedDestination) {
      //destination
      setDestination(selectedDestination);
    } else if (selectedRemoteAuth) {
      //remote auth
      setPreferredDestConnection(remoteAuths.find((remoteAuth) => remoteAuth.guid === destId)!);
      pushView("destination");
    } else if (!selectedRemoteAuth) {
      //needs new connection
      setPreferredNewConnection(RemoteAuthTemplates.find((t) => typeSource(t) === destId)!);
      pushView("connection");
    }
  };

  const showStatus = publishError;
  const status: "ERROR" | "SUCCESS" = true ? "SUCCESS" : "ERROR";

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <BuildLabel build={build} className="border bg-card p-2 rounded-lg font-mono" />
      <div className="space-y-2">
        <label htmlFor="strategy-select" className="text-sm font-medium">
          Destination
        </label>
        <div className="flex gap-2">
          <div className="w-full">
            <Select value={destination?.guid} onValueChange={handleSetDestination}>
              <SelectTrigger className="min-h-12 p-2">
                <SelectValue placeholder="Select Destination" />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                <div className="mono italic text-card-foreground text-xs p-2 flex justify-start items-center gap-2">
                  <UploadCloud size={16} className="text-ring" />
                  My Destinations
                </div>
                {destinations.length === 0 && (
                  <div className="font-mono font-bold italic flex border-dashed p-1 border border-ring justify-center text-2xs mb-2 mx-4">
                    none
                  </div>
                )}
                {destinations.map((dest) => (
                  <SelectItem key={dest.guid} value={dest.guid}>
                    <DestinationLabel destination={dest} />
                  </SelectItem>
                ))}
                <SelectSeparator />
                <div className="mono italic text-card-foreground text-xs p-2 flex justify-start items-center gap-2">
                  <Zap size={16} className="text-ring" />
                  Existing Connections
                </div>
                {remoteAuths.map((auth) => (
                  <SelectItem key={auth.guid} value={auth.guid}>
                    <div className="flex flex-col items-start gap-0">
                      <span className="font-medium flex items-center gap-2 capitalize">
                        <RemoteAuthSourceIconComponent type={auth.type} source={auth.source} size={16} />
                        {auth.name} - <span>{auth.type}</span> / <span> {auth.source}</span>
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">Publish to {auth.source} hosting</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectSeparator />
                <div className="mono italic text-card-foreground text-xs p-2 flex justify-start items-center gap-2">
                  <button
                    className="hover:text-ring flex w-full justify-start gap-2"
                    onClick={() => pushView("connection")}
                  >
                    <Plus size={16} className="text-ring" />
                    Add a connection to publish
                  </button>
                </div>
                {RemoteAuthTemplates.map((connection) => (
                  <SelectItem key={typeSource(connection)} value={typeSource(connection)}>
                    <div className="flex items-center gap-2">
                      {connection.icon}
                      <div>
                        <p className="text-sm font-medium">{connection.name}</p>
                        <p className="text-xs text-muted-foreground">{connection.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={"outline"}
            className="min-h-12"
            onClick={() => pushView(NO_REMOTES ? "connection" : "destination")}
          >
            <Plus />
          </Button>
          {destination && (
            <Button className="min-h-12" type="button" variant="outline" onClick={() => pushView("destination")}>
              <Pencil />
            </Button>
          )}
        </div>
        <div className="w-full">
          <BuildInfo build={build} destination={destination} />
        </div>
      </div>

      {/* Build Controls */}
      {destination && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose || (() => onOpenChange(false))}
            className="flex items-center gap-2"
          >
            Cancel
          </Button>
          <Button onClick={handleBuild} className="flex items-center gap-2" variant="secondary">
            {isPublishing ? (
              <>
                <Loader size={16} className="animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <UploadCloudIcon /> Publish
              </>
            )}
          </Button>
        </div>
      )}

      {/* Build Success Indicator */}
      {showStatus && status === "SUCCESS" && (
        <div className="border-2 border-success bg-card p-4 rounded-lg">
          <div className="flex items-center gap-2 font-mono text-success justify-between">
            <div className="flex items-center gap-4">
              <CheckCircle size={20} className="text-success" />
              <span className="font-semibold uppercase">publish completed successfully</span>
            </div>
            <Button onClick={handleOkay} className="flex items-center gap-2">
              Okay
            </Button>
          </div>
        </div>
      )}

      {/* Build Error Indicator */}
      {showStatus && status === "ERROR" && (
        <div className="border-2 border-destructive bg-card p-4 rounded-lg">
          <div className="flex items-center gap-2 font-mono text-destructive justify-between">
            <div className="flex items-center gap-4">
              <AlertTriangle size={20} className="text-destructive" />
              <span className="font-semibold">BUILD FAILED</span>
            </div>
            <Button onClick={handleOkay} variant="destructive" className="flex items-center gap-2">
              Okay
            </Button>
          </div>
        </div>
      )}
      {/* Log Output */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="text-sm font-medium mb-2">Output</label>
        <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30 h-96">
          <div className="font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic">Output will appear here...</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${log.type === "error" ? "text-destructive" : "text-foreground"}`}
                >
                  <span className="text-muted-foreground shrink-0">[{timeAgo(new Date(log.timestamp))}]</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
