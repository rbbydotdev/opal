import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { BuildLabel } from "@/components/SidebarFileMenu/build-files-section/BuildLabel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO, NULL_BUILD } from "@/data/BuildDAO";
import { BuildLogLine } from "@/data/BuildRecord";
import { DestinationMetaType, DestinationSchemaMap, DestinationCompletenessSchemaMap, DestinationType } from "@/data/DestinationDAO";
import { Workspace } from "@/data/Workspace";
import { BuildLog } from "@/hooks/useBuildLogs";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { cn } from "@/lib/utils";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/BuildRunner";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, CheckCircle, Loader, Plus, X } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
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

export function PublicationModal({
  currentWorkspace,
  cmdRef,
  className,
}: {
  className: string;
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    open: ({ build }: { build: BuildDAO }) => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [build, setBuild] = useState<BuildDAO>(NULL_BUILD);

  const [destinationType, setDestinationType] = useState<DestinationType>("cloudflare");
  const { remoteAuths } = useRemoteAuths();
  const form = useForm<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>({
    defaultValues: useMemo(() => {
      const result = DestinationSchemaMap[destinationType].safeParse(undefined);
      return result.success ? result.data : DestinationSchemaMap[destinationType]._def.defaultValue();
    }, [destinationType]),
    resolver: (values, opt1, opt2) => {
      return zodResolver<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>(
        DestinationSchemaMap[destinationType]
      )(values, opt1, opt2);
    },
    mode: "onSubmit",
  });
  const [mode, setMode] = useState<"new" | "edit">("new");
  const [view, setView] = useState<"publish" | "destination">("publish");
  const handleSubmit = (data: any) => {
    // Handle form submission
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

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
    // if (mode === "edit"){};
    if (view === "destination") {
      setView("publish");
    } else {
      setIsOpen(open);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("overflow-y-auto top-[10vh]", className)}>
        <DialogHeader>
          <DialogTitle>Publish</DialogTitle>
          <DialogDescription>
            {view === "publish" ? "Deploy to selected destination" : "Create Destination to deploy to"}
          </DialogDescription>
        </DialogHeader>
        {view === "destination" && (
          <>
            <PublicationModalDestinationContent
              close={() => setView("publish")}
              handleSubmit={handleSubmit}
              remoteAuths={remoteAuths}
              destinationType={destinationType}
            />
          </>
        )}
        {view === "publish" && (
          <PublicationModalPublishContent
            addDestination={() => setView("destination")}
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

function NetlifyDestinationForm({ form }: { form: UseFormReturn<DestinationMetaType<"netlify">> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="meta.siteName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="My Site" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
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

export function PublicationModalDestinationContent({
  close,
  handleSubmit,
  remoteAuths,
  destinationType,
  // form,
  // children,
  // className,
}: {
  close: () => void;
  handleSubmit: (data: any) => void;
  remoteAuths: ReturnType<typeof useRemoteAuths>["remoteAuths"];
  destinationType: DestinationType;
  // form: UseFormReturn<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>;
  // children: React.ReactNode;
  // className?: string;
}) {
  const currentSchema = useMemo(() => DestinationSchemaMap[destinationType], [destinationType]);
  const currentCompletenessSchema = useMemo(() => DestinationCompletenessSchemaMap[destinationType], [destinationType]);
  
  const form = useForm<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>({
    defaultValues: { ...currentSchema.safeParse(undefined).data, remoteAuthId: remoteAuths[0]?.guid || "" },
    resolver: (values, opt1, opt2) => {
      return zodResolver<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>(
        DestinationSchemaMap[destinationType]
      )(values, opt1, opt2);
    },
    mode: "onSubmit", // Only validate on submit, not on change
  });
  
  // When destinationType changes, reset the form, not ideal but here we are
  useEffect(() => {
    form.reset({ ...currentSchema.safeParse(undefined).data, remoteAuthId: remoteAuths[0]?.guid || "" });
  }, [currentSchema, destinationType, form, remoteAuths]);

  const isComplateOkay = currentCompletenessSchema.safeParse(form.getValues()).success;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          return form.handleSubmit(handleSubmit)();
        }}
        className="space-y-4 py-4 pt-2"
      >
        <FormField
          control={form.control}
          name="remoteAuthId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Type</FormLabel>
              <Select value={field.value || ""} onValueChange={field.onChange}>
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

              <FormMessage />
            </FormItem>
          )}
        />

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
        {destinationType === "cloudflare" && (
          <CloudflareDestinationForm form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>} />
        )}
        {destinationType === "netlify" && (
          <NetlifyDestinationForm form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>} />
        )}

        <div className="w-full justify-end flex gap-4">
          <Button variant="outline" onClick={close}>
            <ArrowLeft /> Back
          </Button>
          <Button type="submit" disabled={!isComplateOkay}>
            Next
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
  build,
  onClose,
}: {
  currentWorkspace: Workspace;
  onOpenChange: (value: boolean) => void;
  build: BuildDAO;
  addDestination: () => void;
  onClose?: () => void;
}) {
  const { remoteAuths } = useRemoteAuths();
  const [publishError, setPublishError] = useState<string | null>(null);
  const [buildRunner, setBuildRunner] = useState<BuildRunner>(NULL_BUILD_RUNNER);
  const [logs, setLogs] = useState<BuildLog[]>([]);

  const buildCompleted = buildRunner ? buildRunner.isSuccessful : false;
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

  const showStatus = buildCompleted || publishError;
  const status: "ERROR" | "SUCCESS" = buildCompleted ? "SUCCESS" : "ERROR";

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <BuildLabel build={build} className="border bg-card p-2 rounded-lg font-mono" />
      <div className="space-y-2">
        <label htmlFor="strategy-select" className="text-sm font-medium">
          Destination
        </label>
        <div className="flex gap-2">
          <Select value={remoteAuths[0]?.guid} onValueChange={(_value: string) => {}}>
            <SelectTrigger className="min-h-14">
              <SelectValue placeholder="Select Destination" />
            </SelectTrigger>
            <SelectContent>
              {remoteAuths.map((auth) => (
                <SelectItem key={auth.guid} value={auth.guid}>
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium flex items-center gap-2 capitalize">
                      <RemoteAuthSourceIconComponent type={auth.type} source={auth.source} size={16} />
                      {auth.name} - <span>{auth.type}</span> / <span> {auth.source}</span>
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">Publish to {auth.source} hosting</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={"outline"} className="min-h-14" onClick={() => addDestination()}>
            <Plus />
          </Button>
        </div>
      </div>

      {/* Build Controls */}
      <div className="flex gap-2">
        {!buildCompleted && (
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
