import type React from "react";
import { useForm } from "react-hook-form";

import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { Github } from "lucide-react";
import { useState } from "react";

import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NotEnv } from "@/lib/notenv";

// SHADCN FORM COMPONENTS
import { ConnectionModalDeviceAuth } from "@/components/ConnectionModalDeviceAuth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
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
          onOpenChange={setIsOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsModalContent({
  mode,
  editConnection,
  onSuccess,
  onOpenChange,
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
  onSuccess?: (rad?: RemoteAuthDAO) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const defaultType = editConnection?.type || connectionTypes[0]!.id;

  const form = useForm<FormValues>({
    defaultValues: {
      connectionType: defaultType,
      apiName: editConnection?.name || "Github-API",
      apiKey: "",
      apiSecret: "",
      apiProxy: NotEnv.GithubCorsProxy || "",
    },
  });

  const [submitting, setSubmitting] = useState(false);

  const selectedConnection = connectionTypes.find((connection) => connection.id === form.watch("connectionType"));

  const handleSubmit = async (values: FormValues) => {
    if (!selectedConnection || !values.apiName.trim()) return;

    setSubmitting(true);
    try {
      if (selectedConnection.type === "apikey") {
        if (mode === "edit" && editConnection) {
          const dao = RemoteAuthDAO.FromJSON({
            guid: editConnection.guid,
            authType: "api",
            tag: values.apiName,
            data: null,
          });
          await dao.save();
          onSuccess?.(dao);
        } else {
          // Create new connection
          const result = await RemoteAuthDAO.Create("api", values.apiName, {
            apiKey: values.apiKey,
            apiSecret: values.apiSecret || values.apiKey,
            apiProxy: values.apiProxy,
          });
          onSuccess?.(result);
        }
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving connection:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthConnect = () => {
    // Handle OAuth flow initiation
    console.log("Initiating OAuth flow for:", selectedConnection);
    form.reset();
    onOpenChange(false);
  };
  return (
    <div className={className}>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Connection" : "Connect to API"}</DialogTitle>
        <DialogDescription>{mode === "edit" ? "Update your connection details." : "Connect to API"}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" autoComplete="off">
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

            {selectedConnection?.type === "apikey" && (
              <>
                <FormField
                  control={form.control}
                  name="apiName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="My GitHub API" required={mode === "add"} />
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
                      <FormLabel>
                        Github API CORS Proxy (optional) <OptionalProbablyToolTip />
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://" />
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
                        <Input {...field} type="password" placeholder="Enter your API key" required={mode === "add"} />
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
                      <FormLabel>API Secret (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Enter your API secret (if different from key)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : mode === "edit" ? "Update" : "Connect"}
                  </Button>
                </div>
              </>
            )}

            {selectedConnection?.type === "oauth" && (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm">
                    You will be redirected to {selectedConnection.name.split(" ")[0]} to authorize this connection.
                    After authorization, you will be redirected back to this application.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleOAuthConnect} className="flex items-center gap-2">
                    {selectedConnection.icon}
                    Connect with {selectedConnection.name.split(" ")[0]}
                  </Button>
                </div>
              </div>
            )}

            {selectedConnection?.type === "device" && (
              <ConnectionModalDeviceAuth
                onSuccess={onSuccess}
                selectedConnection={selectedConnection}
                onCancel={() => onOpenChange(false)}
              />
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}

// DeviceAuth remains unchanged, but you can also refactor it to use RHF if you want.
