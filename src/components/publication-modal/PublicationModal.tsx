import { ConnectionsModalContent } from "@/components/ConnectionsModal";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { RemoteAuthTemplates, typeSource } from "@/components/RemoteAuthTemplate";
import {
  RemoteItemCreateInput,
  RemoteItemSearchDropDown,
  useRemoteNetlifySearch,
  useRemoteNetlifySite,
} from "@/components/RemoteConnectionItem";
import { BuildLabel } from "@/components/SidebarFileMenu/build-files-section/BuildLabel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO, NULL_BUILD } from "@/data/BuildDAO";
import { BuildLogLine } from "@/data/BuildRecord";
import { DestinationMetaType, DestinationSchemaMap, DestinationType, NetlifyDestination } from "@/data/DestinationDAO";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthNetlifyAgent } from "@/data/RemoteAuthAgent";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { RemoteAuthJType, RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { Workspace } from "@/data/Workspace";
import { BuildLog } from "@/hooks/useBuildLogs";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { cn } from "@/lib/utils";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/BuildRunner";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, CheckCircle, Loader, Plus, Search, UploadCloud, X, Zap } from "lucide-react";
import { ReactNode, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { timeAgo } from "short-time-ago";
import z from "zod";

export function usePublicationModalCmd() {
  const cmdRef = useRef<{
    open: ({ build }: { build: BuildDAO }) => void;
    close: () => void;
  }>({
    open: () => {},
    close: () => {},
  });

  return {
    ...cmdRef.current,
    cmdRef,
  };
}
type PublicationViewType = "publish" | "destination" | "connection";

function usePublicationViewStack() {
  const [viewStack, setViewStack] = useState<PublicationViewType[]>(["publish"]);

  const currentView = viewStack[viewStack.length - 1];

  const pushView = (view: PublicationViewType) => {
    setViewStack((prev) => [...prev, view]);
  };

  const popView = () => {
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const resetToDefault = () => {
    setViewStack(["publish"]);
  };

  return {
    currentView,
    pushView,
    popView,
    resetToDefault,
    canGoBack: viewStack.length > 1,
  };
}

export function PublicationModal({
  currentWorkspace,
  cmdRef,
  className,
}: {
  className?: string;
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    open: ({ build }: { build: BuildDAO }) => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [build, setBuild] = useState<BuildDAO>(NULL_BUILD);
  const { remoteAuths } = useRemoteAuths();
  const { currentView, pushView, popView, resetToDefault, canGoBack } = usePublicationViewStack();

  const [preferredNewConnection, setPreferredNewConnection] = useState<Pick<
    RemoteAuthRecord,
    "type" | "source"
  > | null>(null);
  const [preferredDestConnection, setPreferredDestConnection] = useState<RemoteAuthRecord | null>(null);

  const handleSubmit = (data: any) => {
    console.log("Destination form submitted with data:", data);
    // Handle form submission
    // TODO: Save destination and move to next step
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
    console.log("Modal close triggered (X button or programmatic):", open);
    if (!open) resetToDefault(); // Always reset view when closing
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("overflow-y-auto top-[10vh] min-h-[50vh]", className, {
          "min-h-[80vh]": currentView === "publish",
        })}
        // onEscapeKeyDown={(event) => {
        //   if (event.target instanceof HTMLElement && event.target.closest(`#${REPO_URL_SEARCH_ID}`)) {
        //     event.preventDefault();
        //   }
        // }}
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Publish</DialogTitle>
          <DialogDescription>
            <PublicationModalDescription view={currentView} />
          </DialogDescription>
        </DialogHeader>
        {currentView === "destination" && (
          <>
            <PublicationModalDestinationContent
              close={() => {
                console.log("Back button clicked, popping view from stack");
                popView();
              }}
              handleSubmit={handleSubmit}
              remoteAuths={remoteAuths}
              defaultName={currentWorkspace.name}
              preferredDestConnection={preferredDestConnection}
              onAddConnection={() => {
                pushView("connection");
              }}
            />
          </>
        )}
        {currentView === "connection" && (
          <ConnectionsModalContent
            preferredNewConnection={preferredNewConnection}
            mode="add"
            onClose={() => {
              console.log("Connection modal closed, popping view from stack");
              popView();
            }}
            onSuccess={() => {
              console.log("Connection added successfully, popping to previous view");
              popView();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add connection for publish target</DialogTitle>
            </DialogHeader>
          </ConnectionsModalContent>
        )}
        {currentView === "publish" && (
          <PublicationModalPublishContent
            //* for jumping to new connection
            setPreferredNewConnection={setPreferredNewConnection}
            setPreferredDestConnection={setPreferredDestConnection}
            pushView={pushView}
            view={currentView}
            //*
            addDestination={() => pushView("destination")}
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

function NetlifyDestinationForm({
  form,
  remoteAuth,
  destination,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"netlify">>;
  remoteAuth: RemoteAuthDAO | null;
  destination: NetlifyDestination | null;
  defaultName?: string;
}) {
  const [mode, setMode] = useState<"search" | "input" | "create">("input");
  const agent = useRemoteAuthAgent<RemoteAuthNetlifyAgent>(remoteAuth);
  const { isLoading, searchValue, updateSearch, searchResults, error } = useRemoteNetlifySearch({
    agent,
  });
  const { ident, msg, request } = useRemoteNetlifySite({
    createRequest: agent.createSite,
    defaultName,
  });
  if (mode === "search") {
    return (
      <div>
        <FormLabel>Site Name</FormLabel>
        <RemoteItemSearchDropDown
          className="mt-2"
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          onClose={() => setMode("input")}
          onSelect={(item: { element: ReactNode; label: string; value: string }) => {
            form.setValue("meta.siteName", item.value);
            setMode("input");
          }}
          error={error}
          allItems={searchResults}
        />
      </div>
    );
  }
  if (mode === "create") {
    return (
      <div>
        <FormLabel>Site Name</FormLabel>
        <RemoteItemCreateInput
          className="mt-2"
          placeholder="my-netlify-site"
          onClose={() => {
            setMode("input");
          }}
          onCreated={async (res) => {
            void destination?.update({ meta: { siteName: res.name } });
            form.setValue("meta.siteName", res.name);
            setMode("input");
          }}
          request={request}
          msg={msg}
          ident={ident}
        />
      </div>
    );
  }
  if (mode === "input") {
    return (
      <FormField
        control={form.control}
        name="meta.siteName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site Name</FormLabel>
            <div className="flex justify-center w-full items-center gap-2">
              <FormControl>
                <Input {...field} placeholder="my-netlify-site" />
              </FormControl>
              <Button variant="outline" title="Add Site" onClick={() => setMode("create")}>
                <Plus />
              </Button>
              <Button variant="outline" title="Find Site" onClick={() => setMode("search")}>
                <Search />
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }
}
function CloudflareDestinationForm({ form }: { form: UseFormReturn<DestinationMetaType<"cloudflare">> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="meta.accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="account-id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="meta.siteId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site Id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="my-cloudflare-site-id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function PublicationModalDescription({ view }: { view: "publish" | "destination" | "connection" | undefined }) {
  if (!view) return null;
  switch (view) {
    case "publish":
      return "Deploy to selected destination";
    case "destination":
      return "Create Destination to deploy to";
    case "connection":
      return "Add or manage connections";
    default:
      return "Deploy to selected destination";
  }
}

export function PublicationModalDestinationContent({
  close,
  handleSubmit,
  defaultName,
  preferredDestConnection,
  remoteAuths,
  onAddConnection,
}: {
  close: () => void;
  handleSubmit: (data: any) => void;
  defaultName?: string;
  preferredDestConnection: RemoteAuthRecord | null;
  remoteAuths: RemoteAuthDAO[];
  onAddConnection: () => void;
}) {
  const defaultRemoteAuth = preferredDestConnection || remoteAuths[0];
  const defaultDestinationType: DestinationType = defaultRemoteAuth?.source || "custom";
  const [destinationType, setDestinationType] = useState<DestinationType>(defaultDestinationType);
  const currentSchema = useMemo(() => DestinationSchemaMap[destinationType], [destinationType]);

  const form = useForm<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>({
    defaultValues: {
      ...currentSchema._def.defaultValue(),
      remoteAuthId: defaultRemoteAuth?.guid || "",
    },
    resolver: (values, opt1, opt2) => {
      return zodResolver<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>(
        DestinationSchemaMap[destinationType]
      )(values, opt1, opt2);
    },
    mode: "onChange",
  });

  const formValues = form.watch();

  const currentRemoteAuthId = formValues.remoteAuthId;
  const remoteAuth = useMemo(
    () =>
      currentRemoteAuthId ? RemoteAuthDAO.FromJSON(remoteAuths.find((ra) => ra.guid === currentRemoteAuthId)!) : null,
    [currentRemoteAuthId, remoteAuths]
  );

  const isCompleteOkay = currentSchema.safeParse(formValues).success;
  const handleSelectType = (value: string) => {
    form.setValue("remoteAuthId", value);
    const ra = remoteAuths.find((remoteAuth) => remoteAuth.guid === value);
    const newType = ra ? (ra.source as DestinationType) : "custom";
    setDestinationType(newType);
    form.reset({
      ...DestinationSchemaMap[newType]._def.defaultValue(),
      remoteAuthId: value,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 pt-2">
        <FormField
          control={form.control}
          name="remoteAuthId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Type</FormLabel>
              <div className="flex gap-2">
                <Select value={field.value || ""} onValueChange={handleSelectType}>
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select a connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectSeparator />
                    {remoteAuths.map((connection) => (
                      <SelectItem key={connection.guid} value={connection.guid}>
                        <div className="flex items-center gap-2">
                          <RemoteAuthSourceIconComponent source={connection.source} />
                          <div>
                            <p className="text-sm font-medium">{connection.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {connection.source} {connection.type}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={onAddConnection}>
                  <Plus />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {destinationType !== "custom" && (
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Label</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="label" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {destinationType === "cloudflare" && (
          <CloudflareDestinationForm form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>} />
        )}
        {destinationType === "netlify" && (
          <NetlifyDestinationForm
            form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>}
            defaultName={defaultName}
            remoteAuth={remoteAuth}
            destination={null}
          />
        )}

        <div className="w-full justify-end flex gap-4">
          <Button type="button" variant="outline" onClick={close}>
            <ArrowLeft /> Back
          </Button>
          <Button type="submit" disabled={!isCompleteOkay}>
            <Zap />
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function PublicationModalPublishContent({
  currentWorkspace,
  onOpenChange,
  addDestination,
  setPreferredNewConnection,
  setPreferredDestConnection,
  pushView,
  view,
  build,
  onClose,
}: {
  currentWorkspace: Workspace;
  onOpenChange: (value: boolean) => void;
  setPreferredNewConnection: (connection: Pick<RemoteAuthJType, "type" | "source">) => void;
  setPreferredDestConnection: (connection: RemoteAuthRecord) => void;
  pushView: (view: PublicationViewType) => void;
  view: PublicationViewType;
  build: BuildDAO;
  addDestination: () => void;
  onClose?: () => void;
}) {
  const { remoteAuths } = useRemoteAuths();
  const [publishError, setPublishError] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | undefined>();
  const [buildRunner, setBuildRunner] = useState<BuildRunner>(NULL_BUILD_RUNNER);
  const [logs, setLogs] = useState<BuildLog[]>([]);

  const destinations: { guid: string }[] = [];

  const NO_DESTINATIONS = remoteAuths.length === 0;

  // useEffect(() => {
  //   if (destination === undefined && remoteAuths[0]) setDestination(remoteAuths[0]?.guid);
  // }, [destination, remoteAuths]);

  const handleOkay = () => onOpenChange(false);
  const log = useCallback((bl: BuildLogLine) => {
    setLogs((prev) => [...prev, bl]);
  }, []);
  const handleBuild = async () => {
    if (!buildRunner) return;
    await buildRunner.execute({
      log,
    });
    if (buildRunner.isSuccessful) {
      setPublishError(null);
      console.log("Build completed successfully");
    } else if (buildRunner.isFailed) {
      setPublishError("Build failed. Please check the logs for more details.");
    } else if (buildRunner.isCancelled) {
      setPublishError("Build was cancelled.");
    }
  };
  const handleSetDestination = (destId: string) => {
    const selectedRemoteAuth = remoteAuths.find((remoteAuth) => remoteAuth.guid === destId);
    if (!selectedRemoteAuth) {
      setPreferredNewConnection(RemoteAuthTemplates.find((t) => typeSource(t) === destId)!);
      pushView("connection");
    } else if (destinations.find((d) => d.guid === destId)) {
      setDestination(destId);
    } else {
      setPreferredDestConnection(remoteAuths.find((remoteAuth) => remoteAuth.guid === destId)!);
      pushView("destination");
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
          <Select value={destination} onValueChange={handleSetDestination}>
            <SelectTrigger className="min-h-12 p-2">
              <SelectValue placeholder="Select Destination" />
            </SelectTrigger>
            <SelectContent>
              <div className="mono italic text-card-foreground text-xs p-2 flex justify-start items-center gap-2">
                <UploadCloud size={16} className="text-ring" />
                My Destinations
              </div>
              <div className="font-mono font-bold italic flex border-dashed p-1 border border-ring justify-center text-2xs mb-2 mx-4">
                none
              </div>
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
                <Plus size={16} className="text-ring" />
                Add a connection to publish
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
          <Button
            variant={"outline"}
            className="min-h-12"
            onClick={() => pushView(NO_DESTINATIONS ? "connection" : "destination")}
          >
            <Plus />
          </Button>
        </div>
      </div>

      {/* Build Controls */}
      <div className="flex gap-2">
        {!true && (
          <Button
            onClick={handleBuild}
            disabled={buildRunner.isBuilding || buildRunner.isCompleted}
            className="flex items-center gap-2"
          >
            {buildRunner.isBuilding ? (
              <>
                <Loader size={16} className="animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish"
            )}
          </Button>
        )}

        <Button variant="outline" onClick={onClose || (() => onOpenChange(false))} className="flex items-center gap-2">
          <X size={16} />
          Cancel
        </Button>
      </div>

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
                  <span className="text-muted-foreground shrink-0">[{timeAgo(log.timestamp)}]</span>
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
