import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";

import { DeviceAuth } from "@/components/DeviceAuth";
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
import { RemoteAuthDAO, RemoteAuthJType, RemoteAuthOAuthRecordInternal, RemoteAuthSource } from "@/Db/RemoteAuth";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { Channel } from "@/lib/channel";

export function ConnectionsModal({
  children,
  mode = "add",
  editConnection,
  onSuccess = () => {},
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  mode?: "add" | "edit";
  editConnection?: RemoteAuthJType;
  onSuccess?: () => void;
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
  onSuccess = () => {},
  onClose = () => {},
  className,
}: {
  mode: "add" | "edit";
  editConnection?: RemoteAuthJType;
  className?: string;
  onSuccess?: (rad: RemoteAuthDAO) => void;
  onClose?: () => void;
}) {
  //TODO: i dont think this matters?
  const defaultValues = editConnection
    ? {
        ...editConnection,
        templateType: typeSource(editConnection),
      }
    : RemoteAuthTemplates[0]!;
  // {
  //     type: RemoteAuthTemplates[1]!.type,
  //     source: RemoteAuthTemplates[1]!.source,
  //     templateType: typeSource(RemoteAuthTemplates[1]!),
  //     // data: RemoteAuthTemplates[1]!.defaultData,
  //     // name: typeSlug(RemoteAuthTemplates[1]!),
  //   };

  const form = useForm<RemoteAuthFormValues>({
    defaultValues,
  });

  // form.def
  const selectedTemplate = RemoteAuthTemplates.find(
    (connection) => `${connection.type}/${connection.source}` === form.watch("templateType")
  );

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
            name="templateType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Type</FormLabel>
                <Select
                  defaultValue={field.value}
                  onValueChange={(value: typeof field.value) => {
                    // field.onChange(value);
                    form.reset({
                      ...RemoteAuthTemplates.find((t) => typeSource(t) === value),
                    });
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

          {selectedTemplate?.type === "api" && (
            <ApiKeyAuth
              form={form}
              source={selectedTemplate.source}
              onSuccess={onSuccess}
              onCancel={onClose}
              mode={mode}
              editConnection={editConnection}
            />
          )}

          {selectedTemplate?.type === "oauth" && (
            <OAuth
              form={form}
              source={selectedTemplate.source}
              onSuccess={onSuccess}
              onCancel={onClose}
              mode={mode}
              editConnection={editConnection}
            />
          )}
          {selectedTemplate?.type === "oauth-device" && (
            <DeviceAuth
              form={form}
              source={selectedTemplate.source}
              onSuccess={onSuccess}
              onCancel={onClose}
              mode={mode}
              editConnection={editConnection}
            />
          )}
          {/* </form> */}
        </Form>
      </div>
    </div>
  );
}

// API Key Auth Section
function ApiKeyAuth({
  form,
  source,
  onSuccess,
  onCancel,
  mode,
  editConnection,
}: {
  form: UseFormReturn<RemoteAuthFormValues>;
  source: RemoteAuthSource;
  onSuccess: (rad: RemoteAuthDAO) => void;
  onCancel: () => void;
  mode: "add" | "edit";
  editConnection?: RemoteAuthJType;
}) {
  const { submitting, handleSubmit } = useRemoteAuthSubmit(mode, editConnection, onSuccess, onCancel);
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
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
        name="data.corsProxy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{capitalizeFirst(source)} CORS Proxy</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Proxy URL (optional)" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="data.apiKey"
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
        name="data.apiSecret"
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
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => form.handleSubmit(handleSubmit)()}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </div>
  );
}

const OAuthCbEvents = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
};

type OAuthCbEventPayload = {
  [OAuthCbEvents.SUCCESS]: RemoteAuthOAuthRecordInternal;
  [OAuthCbEvents.ERROR]: string;
};

class OAuthCbChannel extends Channel<OAuthCbEventPayload> {}

function OAuth({
  form,
  source,
  onSuccess,
  onCancel,
  mode,
  editConnection,
}: {
  form: UseFormReturn<RemoteAuthFormValues>;
  source: RemoteAuthSource;
  onSuccess: (rad: RemoteAuthDAO) => void;
  onCancel: () => void;
  mode: "add" | "edit";
  editConnection?: RemoteAuthJType;
}) {
  const [submitting, setSubmitting] = useState(false);
  const authRef = useRef<RemoteAuthOAuthRecordInternal | null>(null);

  // use
  useEffect(() => {
    const channel = new OAuthCbChannel("oauth-callback" /* token id ? */);
    channel.on(OAuthCbEvents.SUCCESS, (data) => {
      authRef.current = data;
      setSubmitting(false);
    });
    channel.on(OAuthCbEvents.ERROR, (error) => {
      console.error("OAuth error:", error);
      setSubmitting(false);
    });

    return () => {
      channel.tearDown();
    };
  }, []);

  const { handleSubmit } = useRemoteAuthSubmit(mode, editConnection, onSuccess, onCancel);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>OAuth Connection Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Connection Name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <p className="text-sm text-muted-foreground">
        To connect to {source}, you will be redirected to the OAuth provider's login page.
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={() => form.handleSubmit(handleSubmit)()}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "Connecting..." : `Connect with ${capitalizeFirst(source)}`}
        </Button>
      </div>
    </div>
  );
}

// DeviceAuth remains unchanged, but you can refactor it similarly if needed.
