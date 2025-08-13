import { ConnectionsModalMode } from "@/components/ConnectionsModal";
import { RemoteAuthFormValues } from "@/components/RemoteAuthTemplate";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRemoteAuthSubmit } from "@/components/useRemoteAuthSubmit";
import { RemoteAuthDAO, RemoteAuthJType, RemoteAuthOAuthRecordInternal, RemoteAuthSource } from "@/Db/RemoteAuth";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { Channel } from "@/lib/channel";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

const OAuthCbEvents = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
};

type OAuthCbEventPayload = {
  [OAuthCbEvents.SUCCESS]: RemoteAuthOAuthRecordInternal;
  [OAuthCbEvents.ERROR]: string;
};

class OAuthCbChannel extends Channel<OAuthCbEventPayload> {}
export function OAuth({
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
  mode: ConnectionsModalMode;
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
      <FormField
        control={form.control}
        name="data.corsProxy"
        render={({ field: { value, ...rest } }) => (
          <FormItem>
            <FormLabel>{capitalizeFirst(source)} CORS Proxy</FormLabel>
            <FormControl>
              <Input {...rest} value={value ?? ""} placeholder="Proxy URL (optional)" />
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
