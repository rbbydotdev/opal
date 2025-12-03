import { ConnectionsModalMode } from "@/types/ConnectionsModalTypes";
import type React from "react";
import { useState } from "react";
import { useForm, UseFormReturn, useWatch } from "react-hook-form";

import { DeviceAuth } from "@/components/DeviceAuth";
import { OAuth } from "@/components/OAuth";
import { RemoteAuthFormValues, RemoteAuthTemplates, typeSource } from "@/components/RemoteAuthTemplate";
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
import { RemoteAuthDAO } from "@/data/dao/RemoteAuthDAO";
import {
  isRemoteAuthJType,
  PartialRemoteAuthJType,
  RemoteAuthJType,
  RemoteAuthSchemaMap,
  RemoteAuthSource,
} from "@/data/RemoteAuthTypes";
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent onSelect={onSelect}>
        <ConnectionsModalContent
          sources={sources}
          mode={mode}
          connection={editConnection}
          onSuccess={onSuccess}
          onClose={() => setIsOpen(false)}
        >
          <DialogHeader>
            <DialogTitle>
              <SwitchCase>
                <Case condition={mode === "edit"}>Edit Connection</Case>
                <Case condition={mode === "add"}>Connect to API</Case>
              </SwitchCase>
            </DialogTitle>
            <DialogDescription>
              <SwitchCase>
                <Case condition={mode === "edit"}>Update your connection details.</Case>
                <Case condition={mode === "add"}>Connect to API</Case>
              </SwitchCase>
            </DialogDescription>
          </DialogHeader>
        </ConnectionsModalContent>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsModalContent({
  mode,
  connection,
  onSuccess = () => {},
  onClose = () => {},
  className,
  sources,
  children,
}: {
  mode: ConnectionsModalMode;
  connection?: RemoteAuthJType | PartialRemoteAuthJType | null;
  className?: string;
  onSuccess?: (rad: RemoteAuthDAO) => void;
  onClose?: () => void;
  sources?: RemoteAuthSource[];
  children?: React.ReactNode;
}) {
  const defaultValues = (
    connection
      ? {
          ...connection,
          templateType: typeSource(connection),
        }
      : RemoteAuthTemplates[0]!
  ) as RemoteAuthFormValues;

  const form = useForm<RemoteAuthFormValues>({
    defaultValues,
    resolver: (values, opt1, opt2) => {
      return zodResolver(z.object({ data: RemoteAuthSchemaMap[values.type] }).passthrough())(values, opt1, opt2 as any);
    },
  });

  const templateType = useWatch({
    control: form.control,
    name: "templateType",
  });
  const selectedTemplate = useMemo(
    () => RemoteAuthTemplates.find((connection) => `${connection.type}/${connection.source}` === templateType),
    [templateType]
  );

  const cancelReset = () => {
    form.reset();
    reset(); // Reset the error state from useRemoteAuthSubmit
    onClose();
  };

  const { handleSubmit, reset, error } = useRemoteAuthSubmit(mode, connection, (f) => {
    onSuccess(f);
    form.reset();
  });

  // // Reset form when connection changes (e.g., switching from edit to add mode)
  // useEffect(() => {
  //   if (mode === "add" && !connection) {
  //     form.reset();
  //     reset();
  //   }
  // }, [mode, connection, form, reset]);

  const handleSelectChange = (value: string) => {
    const selectedTemplate = RemoteAuthTemplates.find((t) => typeSource(t) === value);
    if (selectedTemplate && isRemoteAuthJType(connection)) {
      form.reset({
        ...selectedTemplate,
        guid: connection.guid,
        name: form.getValues("name") || connection.name,
        // Merge existing data with new template data, prioritizing existing values
        data: {
          ...selectedTemplate.data,
          ...form.getValues("data"),
        },
      });
    } else {
      form.reset(selectedTemplate);
    }
  };

  return (
    <div className={className}>
      {children}
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
                <Select value={field.value} onValueChange={handleSelectChange} disabled={mode === "edit"}>
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

          {selectedTemplate?.type === "api" && (
            <ApiKeyAuth
              form={form as UseFormReturn<RemoteAuthFormValues<"api">>}
              source={selectedTemplate.source}
              onCancel={cancelReset}
            />
          )}

          {selectedTemplate?.type === "oauth" && (
            <OAuth
              mode={mode}
              form={form as UseFormReturn<RemoteAuthFormValues<"oauth">>}
              source={selectedTemplate.source}
              onCancel={cancelReset}
            />
          )}
          {selectedTemplate?.type === "oauth-device" && (
            <DeviceAuth
              mode={mode}
              form={form as UseFormReturn<RemoteAuthFormValues<"oauth-device">>}
              source={selectedTemplate.source}
              onCancel={cancelReset}
            />
          )}

          {selectedTemplate?.type === "basic-auth" && (
            <BasicAuth
              form={form as UseFormReturn<RemoteAuthFormValues<"basic-auth">>}
              source={selectedTemplate.source}
              onCancel={cancelReset}
            />
          )}

          {selectedTemplate?.type === "no-auth" && (
            <NoAuth
              form={form as UseFormReturn<RemoteAuthFormValues<"no-auth">>}
              source={selectedTemplate.source}
              onCancel={cancelReset}
            />
          )}
        </form>
      </Form>
    </div>
  );
}

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
            <FormLabel>{capitalizeFirst(source)} CORS Proxy</FormLabel>
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
              <FormLabel>{capitalizeFirst(source)} CORS Proxy</FormLabel>
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
          {/* <RemoteAuthSourceIconComponent size={12} source={source} /> */}
          <Zap size={12} />
          Connect
        </Button>
      </div>
    </div>
  );
}

// API Key Auth Section
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
            <FormLabel>{capitalizeFirst(source)} CORS Proxy</FormLabel>
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
          {/* <RemoteAuthSourceIconComponent size={12} source={source} /> */}
          <Zap size={12} />
          Connect
        </Button>
      </div>
    </div>
  );
}
