import { ConnectionsModalMode } from "@/types/ConnectionsModalTypes";
import type React from "react";
import { useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";

import { DeviceAuth } from "@/components/DeviceAuth";
import { OAuth } from "@/components/OAuth";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import z from "zod";
// import { CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "cmdk";

// Re-export type for convenience
export type { ConnectionsModalMode };

export function ConnectionsModal({
  children,
  mode = "add",
  editConnection,
  onSuccess = () => {},
  open,
  onOpenChange,
  onSelect,
}: {
  children?: React.ReactNode;
  mode?: ConnectionsModalMode;
  editConnection?: RemoteAuthJType;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: () => void;
}) {
  // Modal open state is managed here only if not controlled
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        // className="max-w-xl max-h-[80vh] flex flex-col fixed top-[20vh] translate-y-0"
        // <DialogContent
        //   className="_sm:max-w-[26.5625rem] _sm:min-h-[37rem] max-h-[80vh] overflow-y-auto"
        onSelect={onSelect}
      >
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
  onSuccess = () => {},
  onClose = () => {},
  className,
}: {
  mode: ConnectionsModalMode;
  editConnection?: RemoteAuthJType;
  className?: string;
  onSuccess?: (rad: RemoteAuthDAO) => void;
  onClose?: () => void;
}) {
  const defaultValues = editConnection
    ? {
        ...editConnection,
        templateType: typeSource(editConnection),
      }
    : RemoteAuthTemplates[0]!;

  const form = useForm<RemoteAuthFormValues>({
    defaultValues,
    // RemoteAuthTemplates
    resolver: (values, opt1, opt2) => {
      return zodResolver(z.object({ data: RemoteAuthSchemaMap[values.type] }).passthrough())(
        values as any,
        opt1,
        opt2 as any
      );
    },
  });

  const selectedTemplate = useMemo(
    () =>
      RemoteAuthTemplates.find(
        (connection) => `${connection.type}/${connection.source}` === form.watch()["templateType"]
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch()["templateType"], form]
  );
  const cancelReset = () => {
    form.reset();
    reset(); // Reset the error state from useRemoteAuthSubmit
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
      reset(); // Reset the error state
    }
  );

  return (
    <div className={className}>
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Edit Connection" : "Connect to API"}</DialogTitle>
        <DialogDescription>{mode === "edit" ? "Update your connection details." : "Connect to API"}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            return form.handleSubmit(handleSubmit)();
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
                  defaultValue={field.value}
                  onValueChange={(value: typeof field.value) => {
                    form.reset(RemoteAuthTemplates.find((t) => typeSource(t) === value));
                  }}
                >
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select a connection type" />
                  </SelectTrigger>
                  <SelectContent>
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
            <ApiKeyAuth form={form} source={selectedTemplate.source} onCancel={cancelReset} />
          )}

          {selectedTemplate?.type === "oauth" && (
            <OAuth form={form} source={selectedTemplate.source} onCancel={cancelReset} />
          )}
          {selectedTemplate?.type === "oauth-device" && (
            <DeviceAuth form={form} source={selectedTemplate.source} onCancel={cancelReset} />
          )}

          {selectedTemplate?.type === "basic-auth" && (
            <BasicAuth form={form} source={selectedTemplate.source} onCancel={cancelReset} />
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
  form: UseFormReturn<RemoteAuthFormValues>;
  source: RemoteAuthSource;
  onCancel: () => void;
}) {
  // const { submitting, handleSubmit } = useRemoteAuthSubmit(mode, editConnection, onSuccess, onCancel);
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
              <Input {...field} value={field.value ?? ""} placeholder="API Key" required />
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
              <Input {...field} value={field.value ?? ""} placeholder="API Secret (optional)" />
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
          <RemoteAuthSourceIconComponent size={12} source={source} />
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
  form: UseFormReturn<RemoteAuthFormValues>;
  source: RemoteAuthSource;
  onCancel: () => void;
}) {
  // const { submitting, handleSubmit } = useRemoteAuthSubmit(mode, editConnection, onSuccess, onCancel);
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
          <RemoteAuthSourceIconComponent size={12} source={source} />
          Connect
        </Button>
      </div>
    </div>
  );
}
