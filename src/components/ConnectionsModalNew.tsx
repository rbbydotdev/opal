import { ConnectionsModalMode } from "@/types/ConnectionsModalTypes";
import type React from "react";
import { useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";

import { DeviceAuth } from "@/components/DeviceAuth";
import { ModalShell } from "@/components/modals/ModalShell";
import { OAuth } from "@/components/OAuth";
import { RemoteAuthFormValues, RemoteAuthTemplates, typeSource } from "@/components/RemoteAuthTemplate";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRemoteAuthSubmit } from "@/components/useRemoteAuthSubmit";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthJType, RemoteAuthSchemaMap, RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { Case, SwitchCase } from "@/lib/SwitchCase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Zap } from "lucide-react";
import { useMemo } from "react";
import z from "zod";

export function ConnectionsModal({
  children,
  mode = "add",
  editConnection,
  onSuccess = () => {},
  open,
  onOpenChange,
  onSelect,
  sources,
}: {
  children?: React.ReactNode;
  mode?: ConnectionsModalMode;
  editConnection?: RemoteAuthJType;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: () => void;
  sources?: RemoteAuthSource[];
}) {
  // Modal open state is managed here only if not controlled
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const getTitle = () => {
    switch (mode) {
      case "edit": return "Edit Connection";
      case "view": return "View Connection";
      case "add": 
      default: return "Connect to API";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "edit": return "Update your connection details.";
      case "view": return "View connection details";
      case "add": 
      default: return "Connect to API";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <ModalShell 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
      >
        <SwitchCase>
          <Case condition={mode === "add"}>
            <DialogHeader>
              <DialogTitle>{getTitle()}</DialogTitle>
              <DialogDescription>{getDescription()}</DialogDescription>
            </DialogHeader>
            
            <ConnectionsModalContent
              sources={sources}
              mode={mode}
              editConnection={editConnection}
              onSuccess={onSuccess}
              onClose={() => setIsOpen(false)}
            />
          </Case>

          <Case condition={mode === "edit"}>
            <DialogHeader>
              <DialogTitle>{getTitle()}</DialogTitle>
              <DialogDescription>{getDescription()}</DialogDescription>
            </DialogHeader>
            
            <ConnectionsModalContent
              sources={sources}
              mode={mode}
              editConnection={editConnection}
              onSuccess={onSuccess}
              onClose={() => setIsOpen(false)}
            />
          </Case>

          <Case condition={mode === "view"}>
            <DialogHeader>
              <DialogTitle>{getTitle()}</DialogTitle>
              <DialogDescription>{getDescription()}</DialogDescription>
            </DialogHeader>
            
            <ConnectionsModalContent
              sources={sources}
              mode={mode}
              editConnection={editConnection}
              onSuccess={onSuccess}
              onClose={() => setIsOpen(false)}
            />
          </Case>
        </SwitchCase>
      </ModalShell>
    </Dialog>
  );
}

export function ConnectionsModalContent({
  mode,
  editConnection,
  preferredNewConnection,
  onSuccess = () => {},
  onClose = () => {},
  className,
  sources,
}: {
  mode: ConnectionsModalMode;
  editConnection?: RemoteAuthJType;
  preferredNewConnection?: Pick<RemoteAuthJType, "type" | "source"> | null;
  className?: string;
  onSuccess?: (rad: RemoteAuthDAO) => void;
  onClose?: () => void;
  sources?: RemoteAuthSource[];
}) {
  const defaultValues = (
    preferredNewConnection
      ? {
          ...preferredNewConnection,
          templateType: typeSource(preferredNewConnection),
        }
      : editConnection
        ? {
            ...editConnection,
            templateType: typeSource(editConnection),
          }
        : RemoteAuthTemplates[0]!
  ) as RemoteAuthFormValues;

  const form = useForm<RemoteAuthFormValues>({
    defaultValues,
    resolver: (values, opt1, opt2) => {
      return zodResolver(z.object({ data: RemoteAuthSchemaMap[values.type] }).passthrough())(values, opt1, opt2 as any);
    },
  });

  const templateType = form.watch()["templateType"];
  const selectedTemplate = useMemo(
    () => RemoteAuthTemplates.find((connection) => `${connection.type}/${connection.source}` === templateType),
    [templateType]
  );

  const cancelReset = () => {
    form.reset();
    reset();
    onClose();
  };

  const { handleSubmit, reset, error } = useRemoteAuthSubmit(
    mode,
    editConnection,
    (f) => {
      onSuccess(f);
      form.reset();
    },
    () => {
      onClose();
      form.reset();
      reset();
    }
  );

  return (
    <div className={className}>
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
            name="templateType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Type</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value: typeof field.value) => {
                    const selectedTemplate = RemoteAuthTemplates.find((t) => typeSource(t) === value);
                    if (selectedTemplate && editConnection) {
                      form.reset({
                        ...selectedTemplate,
                        guid: editConnection.guid,
                        name: form.getValues("name") || editConnection.name,
                        data: { ...selectedTemplate.data, ...form.getValues("data") },
                      });
                    } else {
                      form.reset(selectedTemplate);
                    }
                  }}
                >
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select a connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RemoteAuthTemplates.filter((t) => (sources ? sources.includes(t.source) : true)).map(
                      (connection) => (
                        <SelectItem key={typeSource(connection)} value={typeSource(connection)}>
                          <div className="flex items-center gap-2">
                            {connection.icon}
                            <div>
                              <p className="text-sm font-medium">{connection.name}</p>
                              <p className="text-xs text-muted-foreground">{connection.description}</p>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="rounded-md bg-destructive p-4 text-destructive-foreground">
              <p className="mb-2 font-bold">Connection Error</p>
              <p className="mb-2">{error}</p>
            </div>
          )}

          <SwitchCase>
            <Case condition={selectedTemplate?.type === "api"}>
              <ApiKeyAuth
                form={form as UseFormReturn<RemoteAuthFormValues<"api">>}
                source={selectedTemplate!.source}
                onCancel={cancelReset}
              />
            </Case>

            <Case condition={selectedTemplate?.type === "oauth"}>
              <OAuth
                mode={mode}
                form={form as UseFormReturn<RemoteAuthFormValues<"oauth">>}
                source={selectedTemplate!.source}
                onCancel={cancelReset}
              />
            </Case>

            <Case condition={selectedTemplate?.type === "oauth-device"}>
              <DeviceAuth
                mode={mode}
                form={form as UseFormReturn<RemoteAuthFormValues<"oauth-device">>}
                source={selectedTemplate!.source}
                onCancel={cancelReset}
              />
            </Case>

            <Case condition={selectedTemplate?.type === "basic-auth"}>
              <BasicAuth
                form={form as UseFormReturn<RemoteAuthFormValues<"basic-auth">>}
                source={selectedTemplate!.source}
                onCancel={cancelReset}
              />
            </Case>

            <Case condition={selectedTemplate?.type === "no-auth"}>
              <NoAuth
                form={form as UseFormReturn<RemoteAuthFormValues<"no-auth">>}
                source={selectedTemplate!.source}
                onCancel={cancelReset}
              />
            </Case>
          </SwitchCase>
        </form>
      </Form>
    </div>
  );
}

// ... rest of the auth components remain the same ...

// API Key Auth Section
function ApiKeyAuth({
  form,
  source,
  onCancel,
}: {
  form: UseFormReturn<RemoteAuthFormValues<"api">>;
  source: RemoteAuthSource;
  onCancel: () => void;
}) {
  const [hideApiKey, setHideApiKey] = useState(true);
  const [hideApiSecret, setHideApiSecret] = useState(true);
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        rules={{ required: "API Name is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Name</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="API Name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="data.corsProxy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {capitalizeFirst(source)} CORS Proxy (optional) <OptionalProbablyToolTip />
            </FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Proxy URL (optional)" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="data.apiKey"
        rules={{ required: "API Key is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="API Key"
                  type={hideApiKey ? "password" : "text"}
                  required
                  className="flex-1"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHideApiKey(!hideApiKey)}
                  aria-label="Toggle API Key Visibility"
                  className="shrink-0"
                >
                  {hideApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="data.apiSecret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Secret</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="API Secret (optional)"
                  type={hideApiSecret ? "password" : "text"}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHideApiSecret(!hideApiSecret)}
                  aria-label="Toggle API Secret Visibility"
                  className="shrink-0"
                >
                  {hideApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
        <Button type="submit" className="w-full">
          <Zap size={12} />
          Connect
        </Button>
      </div>
    </div>
  );
}

function NoAuth({
  form,
  source,
  onCancel,
}: {
  form: UseFormReturn<RemoteAuthFormValues<"no-auth">>;
  source: RemoteAuthSource;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="data.corsProxy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {capitalizeFirst(source)} CORS Proxy (optional) <OptionalProbablyToolTip />
            </FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Proxy URL (optional)" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="data.endpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{capitalizeFirst(source)} Endpoint</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Endpoint" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
        <Button type="submit" className="w-full">
          <Zap size={12} />
          Connect
        </Button>
      </div>
    </div>
  );
}

function BasicAuth({
  form,
  source,
  onCancel,
}: {
  form: UseFormReturn<RemoteAuthFormValues<"basic-auth">>;
  source: RemoteAuthSource;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="data.corsProxy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {capitalizeFirst(source)} CORS Proxy (optional) <OptionalProbablyToolTip />
            </FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Proxy URL (optional)" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="data.endpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{capitalizeFirst(source)} Endpoint</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Endpoint" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="data.username"
        rules={{ required: "Username is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Username" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="data.password"
        rules={{ required: "Password is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Password" required />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
        <Button type="submit" className="w-full">
          <Zap size={12} />
          Connect
        </Button>
      </div>
    </div>
  );
}