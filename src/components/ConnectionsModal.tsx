import { Github } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { DeviceAuth } from "@/components/DeviceAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { NotEnv } from "@/lib/notenv";

export type ConnectionType = {
  id: string;
  name: string;
  description: string;
  type: "oauth" | "apikey" | "device";
  icon: React.ReactNode;
};

const connectionTypes: ConnectionType[] = [
  {
    id: "github-api",
    name: "GitHub API",
    description: "Connect using a GitHub API key",
    type: "apikey",
    icon: <Github className="h-5 w-5" />,
  },
  {
    id: "github-device",
    name: "GitHub Device Auth",
    description: "Connect using GitHub Device Authentication",
    type: "device",
    icon: <Github className="h-5 w-5" />,
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    type: "oauth",
    icon: <Github className="h-5 w-5" />,
  },
];

type FormValues = {
  connectionType: string;
  apiName: string;
  apiKey: string;
  apiSecret: string;
  apiProxy: string;
};

export function ConnectionsModal({
  children,
  mode = "add",
  editConnection,
  onSuccess,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  mode?: "add" | "edit";
  editConnection?: {
    guid: string;
    name: string;
    type: string;
    authType: "api" | "oauth";
  };
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  // Modal open state is managed here only if not controlled
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[26.5625rem]">
        <ConnectionsModalContent
          mode={mode}
          editConnection={editConnection}
          onSuccess={onSuccess}
          onClose={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsModalContent({
  mode,
  editConnection,
  onSuccess,
  onClose,
  className,
}: {
  mode: "add" | "edit";
  editConnection?: {
    guid: string;
    name: string;
    type: string;
    authType: "api" | "oauth";
  };
  className?: string;
  onSuccess: (rad: RemoteAuthDAO) => void;
  onClose: () => void;
}) {
  const defaultType = editConnection?.type || connectionTypes[0]!.id;
  const form = useForm<FormValues>({
    defaultValues: {
      connectionType: defaultType,
    },
  });
  const selectedConnection = connectionTypes.find((connection) => connection.id === form.watch("connectionType"));

  return (
    <div className={className}>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Connection" : "Connect to API"}</DialogTitle>
        <DialogDescription>{mode === "edit" ? "Update your connection details." : "Connect to API"}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Form {...form}>
          <FormField
            control={form.control}
            name="connectionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select a connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectionTypes.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
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
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedConnection?.type === "apikey" && <ApiKeyAuth onSubmit={() => {}} onCancel={onClose} />}

          {selectedConnection?.type === "oauth" && (
            <OAuth selectedConnection={selectedConnection} onSubmit={() => {}} onCancel={() => {}} />
          )}
          {selectedConnection?.type === "device" && (
            <DeviceAuth selectedConnection={selectedConnection} onSubmit={() => {}} onCancel={() => {}} />
          )}
          {/* </form> */}
        </Form>
      </div>
    </div>
  );
}

// API Key Auth Section
function ApiKeyAuth({ onSubmit, onCancel }: { onSubmit: (rad: RemoteAuthDAO) => void; onCancel: () => void }) {
  const form = useForm<FormValues>({
    defaultValues: {
      apiKey: "",
      apiSecret: "",
      apiProxy: NotEnv.GithubCorsProxy || "",
    },
  });
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(data: FormValues) {
    setSubmitting(true);
    onSubmit(
      await RemoteAuthDAO.Create("api", data.apiName, {
        apiKey: data.apiKey,
        apiSecret: data.apiSecret || data.apiKey,
        apiProxy: data.apiProxy,
      })
    );
    setSubmitting(false);
  }

  // const handleApiKeySubmit = async (values: FormValues) => {
  //   if (!selectedConnection || !values.apiName.trim()) return;
  //   setSubmitting(true);
  //   try {
  //     if (mode === "edit" && editConnection) {
  //       const dao = RemoteAuthDAO.FromJSON({
  //         guid: editConnection.guid,
  //         authType: "api",
  //         tag: values.apiName,
  //         data: null,
  //       });
  //       await dao.save();
  //       onSuccess?.(dao);
  //     } else {
  //       const result = await RemoteAuthDAO.Create("api", values.apiName, {
  //         apiKey: values.apiKey,
  //         apiSecret: values.apiSecret || values.apiKey,
  //         apiProxy: values.apiProxy,
  //       });
  //       onSuccess?.(result);
  //     }
  //     form.reset();
  //     onClose();
  //   } catch (error) {
  //     console.error("Error saving connection:", error);
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" autoComplete="off">
      <FormField
        control={form.control}
        name="apiName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="API Name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="apiProxy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CORS Proxy</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Proxy URL (optional)" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input {...field} placeholder="API Key" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="apiSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Secret</FormLabel>
            <FormControl>
              <Input {...field} placeholder="API Secret (optional)" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Connecting..." : "Connect"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// OAuth Section
function OAuth({
  selectedConnection,
  onSubmit: onConnect,
  onCancel,
}: {
  selectedConnection: ConnectionType;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        To connect to {selectedConnection.name}, you will be redirected to the OAuth provider's login page.
      </p>
      <Button type="button" variant="default" onClick={onConnect} className="w-full">
        Connect with {selectedConnection.name}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} className="w-full">
        Cancel
      </Button>
    </div>
  );
}

// DeviceAuth remains unchanged, but you can refactor it similarly if needed.
