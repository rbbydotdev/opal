import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { RemoteAuthFormValues } from "@/components/RemoteAuthTemplate";
import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RemoteAuthOAuthRecordInternal, RemoteAuthSource } from "@/Db/RemoteAuth";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { Channel } from "@/lib/channel";
import { useEffect, useRef } from "react";
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
  onCancel,
}: {
  form: UseFormReturn<RemoteAuthFormValues>;
  source: RemoteAuthSource;
  onCancel: () => void;
}) {
  const authRef = useRef<RemoteAuthOAuthRecordInternal | null>(null);

  // use
  useEffect(() => {
    const channel = new OAuthCbChannel("oauth-callback" /* token id ? */);
    channel.on(OAuthCbEvents.SUCCESS, (data) => {
      authRef.current = data;
    });
    channel.on(OAuthCbEvents.ERROR, (error) => {
      console.error("OAuth error:", error);
    });

    return () => {
      channel.tearDown();
    };
  }, []);

  // const { handleSubmit } = useRemoteAuthSubmit(mode, editConnection, onSuccess, onCancel);

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
            <FormLabel>
              {capitalizeFirst(source)} CORS Proxy (optional) <OptionalProbablyToolTip />
            </FormLabel>
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
        <Button type="submit" variant="default" className="w-full">
          <RemoteAuthSourceIconComponent size={12} source={source} />
          Connect with {capitalizeFirst(source)}
        </Button>
      </div>
    </div>
  );
}
