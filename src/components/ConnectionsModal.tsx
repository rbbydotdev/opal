import { Github } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
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
import {
  RemoteAuthDAO,
  RemoteAuthJTypePublic,
  RemoteAuthOAuthRecordInternal,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
} from "@/Db/RemoteAuth";
import { Channel } from "@/lib/channel";
import { NotEnv } from "@/lib/notenv";

export type SourceTemplate = {
  id: string;
  name: string;
  description: string;
  source: RemoteAuthSource;
  type: RemoteAuthType;
  icon: React.ReactNode;
};

const adapterTemplates: readonly SourceTemplate[] = [
  {
    id: "github-api",
    name: "GitHub API",
    description: "Connect using a GitHub API key",
    source: "github",
    type: "api",
    icon: <Github className="h-5 w-5" />,
  },
  {
    id: "github-device",
    name: "GitHub Device Auth",
    description: "Connect using GitHub Device Authentication",
    source: "github",
    type: "oauth-device",
    icon: <Github className="h-5 w-5" />,
  },
  {
    id: "github-oauth",
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    source: "github",
    type: "oauth",
    icon: <Github className="h-5 w-5" />,
  },
];

type BaseFormValues = {
  templateType: string;
};

// type ApiKeyFormValues = BaseFormValues & {
//   type: RemoteAuthType;
//   source: RemoteAuthSource;
//   name: string;
//   apiKey: string;
//   apiSecret: string;
//   apiProxy: string;
// };

// type OAuthFormValues = BaseFormValues & {
//   type: "oauth";
//   name: string;
//   source: RemoteAuthSource;
// };

// type DeviceAuthFormValues = BaseFormValues & {
//   type: "oauth-device";
//   name: string;
//   source: RemoteAuthSource;
// };

type FormValues = RemoteAuthRecord & {
  templateType: string;
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
  editConnection?: RemoteAuthJTypePublic;
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
  onSuccess = () => {},
  onClose = () => {},
  className,
}: {
  mode: "add" | "edit";
  editConnection?: RemoteAuthJTypePublic;
  className?: string;
  onSuccess?: (rad: RemoteAuthDAO) => void;
  onClose?: () => void;
}) {
  const defaultType = editConnection?.type || adapterTemplates[0]!.id;
  // const selectedtemplateType = adapterTemplates.find((ct) => ct.id === defaultType);

  const getDefaultValues = (templateType: string): FormValues => {
    const connection = adapterTemplates.find((ct) => ct.id === templateType);
    switch (connection?.type) {
      case "oauth":
        //@ts-ignore
        return {
          templateType,
          type: "oauth" as const,
          name: editConnection?.name || "my-oauth",
        };
      case "oauth-device":
        //@ts-ignore
        return {
          templateType,
          type: "oauth-device" as const,
          name: editConnection?.name || "my-device-auth",
        };
      // case "apikey":
      default:
        return {
          templateType,
          //@ts-ignore
          type: "apikey" as const,
          name: editConnection?.name || "my-api",
          apiKey: "",
          apiSecret: "",
          apiProxy: NotEnv.GithubApiProxy || "",
        };
    }
  };

  const form = useForm<FormValues>({
    defaultValues: getDefaultValues(defaultType),
  });
  const selectedTemplate = adapterTemplates.find((connection) => connection.id === form.watch("templateType"));

  const handletemplateTypeChange = (adapterClass: string) => {
    const newDefaults = getDefaultValues(adapterClass);
    form.reset(newDefaults);
  };

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
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handletemplateTypeChange(value);
                  }}
                >
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select a connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    {adapterTemplates.map((connection) => (
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

          {selectedTemplate?.type === "api" && (
            <ApiKeyAuth
              form={form}
              selectedConnection={selectedTemplate}
              onSuccess={onSuccess}
              onCancel={onClose}
              mode={mode}
              editConnection={editConnection}
            />
          )}

          {selectedTemplate?.type === "oauth" && (
            <OAuth
              form={form}
              selectedConnection={selectedTemplate}
              onSuccess={onSuccess}
              onCancel={onClose}
              mode={mode}
              editConnection={editConnection}
            />
          )}
          {selectedTemplate?.type === "oauth-device" && (
            <DeviceAuth
              form={form}
              selectedConnection={selectedTemplate}
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
  selectedConnection,
  onSuccess,
  onCancel,
  mode,
  editConnection,
}: {
  form: any; // UseFormReturn<ApiKeyFormValues>
  selectedConnection: SourceTemplate;
  onSuccess: (rad: RemoteAuthDAO) => void;
  onCancel: () => void;
  mode: "add" | "edit";
  editConnection?: RemoteAuthJTypePublic;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formValues: FormValues) {
    setSubmitting(true);
    try {
      if (mode === "edit" && editConnection) {
        const dao = RemoteAuthDAO.FromJSON({
          source: "github",
          guid: editConnection.guid,
          type: editConnection.type,
          name: formValues.name,
          data: formValues.data,
        });
        await dao.save();
        onSuccess(dao);
      } else {
        const { type, source, name, ...values } = formValues;
        const result = await RemoteAuthDAO.Create(type, source, name, values.data!);
        onSuccess(result);
      }
      onCancel();
    } catch (error) {
      console.error("Error saving connection:", error);
    } finally {
      setSubmitting(false);
    }
  }

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
// OAuth Section
function OAuth({
  form,
  selectedConnection,
  onSuccess,
  onCancel,
  mode,
  editConnection,
}: {
  form: any; // UseFormReturn<OAuthFormValues>
  selectedConnection: SourceTemplate;
  onSuccess: (rad: RemoteAuthDAO) => void;
  onCancel: () => void;
  mode: "add" | "edit";
  editConnection?: RemoteAuthJTypePublic;
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

  const handleOAuthConnect = async () => {
    setSubmitting(true);
    try {
      const values = form.getValues() as FormValues;
      if (mode === "edit" && editConnection) {
        const dao = RemoteAuthDAO.FromJSON({
          guid: editConnection.guid,
          source: "github",
          type: "oauth",
          name: values.name,
          data: null,
        });
        await dao.save();
        onSuccess(dao);
      } else {
        const result = await RemoteAuthDAO.Create("oauth", "github", values.name, authRef.current!);
        onSuccess(result);
      }
      onCancel();
    } catch (error) {
      console.error("Error saving OAuth connection:", error);
    } finally {
      setSubmitting(false);
    }
  };

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
        To connect to {selectedConnection.name}, you will be redirected to the OAuth provider's login page.
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
        <Button type="button" variant="default" onClick={handleOAuthConnect} disabled={submitting} className="w-full">
          {submitting ? "Connecting..." : `Connect with ${selectedConnection.name}`}
        </Button>
      </div>
    </div>
  );
}

// DeviceAuth remains unchanged, but you can refactor it similarly if needed.
