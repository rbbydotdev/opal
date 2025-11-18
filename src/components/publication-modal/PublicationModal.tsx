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
import {
  DestinationDAO,
  DestinationMetaType,
  DestinationSchemaMap,
  DestinationType,
  NetlifyDestination,
} from "@/data/DestinationDAO";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthNetlifyAgent } from "@/data/RemoteAuthAgent";
import { useRemoteAuthAgent } from "@/data/RemoteAuthToAgent";
import { RemoteAuthJType, RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { Workspace } from "@/data/Workspace";
import { BuildLog } from "@/hooks/useBuildLogs";
import { useDestinations } from "@/hooks/useDestinations";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, CheckCircle, Loader, Plus, Search, UploadCloud, X, Zap } from "lucide-react";
import { ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
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

function useViewStack<T extends string = PublicationViewType>(defaultView: T) {
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
  const [destination, setDestination] = useState<DestinationDAO | null>(null);
  const { currentView, pushView, replaceView, popView, resetToDefault, canGoBack } =
    useViewStack<PublicationViewType>("publish");

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
              onAddConnection={() => pushView("connection")}
            />
          </>
        )}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const agent = useRemoteAuthAgent<RemoteAuthNetlifyAgent>(remoteAuth);
  const { isLoading, searchValue, updateSearch, searchResults, error, clearError } = useRemoteNetlifySearch({
    agent,
  });
  const { ident, msg, request } = useRemoteNetlifySite({
    createRequest: agent.createSite,
    defaultName,
  });

  useEffect(() => {
    if (mode === "input" && inputRef.current) inputRef.current?.focus();
  }, [mode]);

  const handleCreateSubmit = async () => {
    const res = await request.submit();
    if (!res) return null;
    void destination?.update({ meta: { siteName: res.name } });
    form.setValue("meta.siteName", res.name);
    setMode("input");
  };
  if (mode === "search") {
    return (
      <div>
        <FormLabel>Site Name</FormLabel>
        <RemoteItemSearchDropDown
          className="mt-2"
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={updateSearch}
          onClose={(val?: string) => {
            setMode("input");
            if (val) {
              form.setValue("meta.siteName", val);
            }
          }}
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
          onClose={(inputVal?: string) => {
            setMode("input");
            if (inputVal) {
              form.setValue("meta.siteName", inputVal);
            }
          }}
          submit={handleCreateSubmit}
          // }
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
                <Input
                  {...field}
                  ref={inputRef}
                  placeholder="my-netlify-site"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
              </FormControl>
              <Button
                variant="outline"
                title="Add Site"
                onClick={() => {
                  const currentValue = form.getValues("meta.siteName");
                  ident.setName(currentValue || "");
                  setMode("create");
                }}
              >
                <Plus />
              </Button>
              <Button
                variant="outline"
                title="Find Site"
                onClick={() => {
                  const currentValue = form.getValues("meta.siteName");
                  updateSearch(currentValue || "");
                  setMode("search");
                }}
              >
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
      currentRemoteAuthId
        ? RemoteAuthDAO.FromJSON(remoteAuths.find((remoteAuth) => remoteAuth.guid === currentRemoteAuthId)!)
        : null,
    [currentRemoteAuthId, remoteAuths]
  );

  const isCompleteOkay = currentSchema.safeParse(formValues).success;

  const handleSelectType = (value: string) => {
    form.setValue("remoteAuthId", value);
    const remoteAuth = remoteAuths.find((remoteAuth) => remoteAuth.guid === value);
    const newType = remoteAuth ? (remoteAuth.source as DestinationType) : "custom";
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
  pushView: (view: PublicationViewType) => void;
  setDestination: (destination: DestinationDAO) => void;
  setPreferredDestConnection: (connection: RemoteAuthRecord) => void;
  setPreferredNewConnection: (connection: Pick<RemoteAuthJType, "type" | "source">) => void;
}) {
  const { remoteAuths } = useRemoteAuths();
  const { destinations } = useDestinations();

  const [publishError, setPublishError] = useState<string | null>(null);
  const [logs, setLogs] = useState<BuildLog[]>([]);

  const NO_REMOTES = remoteAuths.length === 0;

  const handleOkay = () => onOpenChange(false);
  const log = useCallback((bl: BuildLogLine) => {
    setLogs((prev) => [...prev, bl]);
  }, []);
  const handleBuild = async () => {};
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
          <Select value={destination?.guid} onValueChange={handleSetDestination}>
            <SelectTrigger className="min-h-12 p-2">
              <SelectValue placeholder="Select Destination" />
            </SelectTrigger>
            <SelectContent>
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
                  <div className="flex flex-col items-start gap-0">
                    <span className="font-medium flex items-center gap-2 capitalize">
                      <RemoteAuthSourceIconComponent
                        type={dest.RemoteAuth.type}
                        source={dest.RemoteAuth.source}
                        size={16}
                      />
                      {dest.label} - <span>{dest.RemoteAuth.type}</span> / <span> {dest.RemoteAuth.source}</span>
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      Publish to {dest.RemoteAuth.source} hosting
                    </span>
                  </div>
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
            onClick={() => pushView(NO_REMOTES ? "connection" : "destination")}
          >
            <Plus />
          </Button>
        </div>
      </div>

      {/* Build Controls */}
      <div className="flex gap-2">
        {!true && (
          <Button onClick={handleBuild} className="flex items-center gap-2">
            {false ? (
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
