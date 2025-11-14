import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { BuildLabel } from "@/components/SidebarFileMenu/build-files-section/BuildLabel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO, NULL_BUILD } from "@/data/BuildDAO";
import { BuildLogLine } from "@/data/BuildRecord";
import { DestinationDAO, DestinationSchemaMap, DestinationSchemaTypeMap, DestinationType } from "@/data/DestinationDAO";
import { Workspace } from "@/data/Workspace";
import { BuildLog } from "@/hooks/useBuildLogs";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/BuildRunner";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle, Loader, Plus, X } from "lucide-react";
import { useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
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
}: {
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    open: ({ build }: { build: BuildDAO }) => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const [build, setBuild] = useState<BuildDAO>(NULL_BUILD);
  const [destination, setDestination] = useState<DestinationDAO | null>(null);
  const [view, setView] = useState<"connection" | "publish">("connection");
  // const [publication

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
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {view === "publish" && (
        <PublicationModalContent currentWorkspace={currentWorkspace} onOpenChange={setIsOpen} build={build} />
      )}
      {view === "connection" && (
        <PublicationModalConnection currentWorkspace={currentWorkspace} destination={destination} />
      )}
    </Dialog>
  );
}

function PublicationModalConnection({
  className,
  currentWorkspace,
  destination,
}: {
  className?: string;
  currentWorkspace: Workspace;
  destination: DestinationDAO | null;
}) {
  const MyZod = z.object({
    thing: z.string(),
  });

  const [destinationType, setDestinationType] = useState<DestinationType>("cloudflare");
  const remoteAuths = useRemoteAuths();
  const form = useForm<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>({
    defaultValues: useMemo(() => DestinationSchemaMap[destinationType].parse(undefined), [destinationType]),
    resolver: (values, opt1, opt2) => {
      return zodResolver<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>(
        DestinationSchemaMap[destinationType]
      )(values, opt1, opt2);
    },
  });
  const mode = "edit";
  const handleSubmit = (data: any) => {
    console.log("Form submitted:", data);
  };

  return (
    <DialogContent className={className}>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Publish Target" : "Publish Target"}</DialogTitle>
        <DialogDescription>{mode === "edit" ? "Update your connection details." : "Connect to API"}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            return form.handleSubmit(handleSubmit, (fieldErrors) => {
              console.error("form validation failed", fieldErrors);
            })();
          }}
          className="space-y-4 py-4"
        >
          <FormField
            control={form.control}
            name="remoteAuthId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Type</FormLabel>
                <Select defaultValue={field.value} onValueChange={(value: typeof field.value) => {}}>
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select a connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[].map((connection) => (
                      <SelectItem key={connection} value={connection}>
                        <div className="flex items-center gap-2">
                          {connection}
                          <div>
                            <p className="text-sm font-medium">{connection}</p>
                            <p className="text-xs text-muted-foreground">{connection}</p>
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
                <FormLabel>label</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="label" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {destinationType === "cloudflare" && (
            <CloudflareDestinationForm form={form as DestinationFormType<"cloudflare">} />
          )}
        </form>
      </Form>
    </DialogContent>
  );
}
type DestinationFormType<T extends DestinationType> = T extends DestinationType
  ? UseFormReturn<DestinationSchemaTypeMap<T>["meta"]>
  : never;

function CloudflareDestinationForm({ form }: { form: UseFormReturn<DestinationFormType<"cloudflare">> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>account id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="account id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="siteId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>site id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="site id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
