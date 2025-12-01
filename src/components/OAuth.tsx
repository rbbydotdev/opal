import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { RemoteAuthFormValues } from "@/components/RemoteAuthTemplate";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RemoteAuthDataFor, RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { OAuthService, OAuthState } from "@/lib/auth/OAuthService";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { ConnectionsModalMode } from "@/types/ConnectionsModalTypes";
import { Check, Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

export function OAuth({
  mode = "add",
  form,
  source,
  onCancel,
}: {
  mode?: ConnectionsModalMode;
  form: UseFormReturn<RemoteAuthFormValues<"oauth">>;
  source: RemoteAuthSource;
  onCancel: () => void;
}) {
  const oauthServiceRef = useRef<OAuthService | null>(null);
  const [oauthState, setOAuthState] = useState<OAuthState>("idle");
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize OAuth service
  useEffect(() => {
    oauthServiceRef.current = new OAuthService();

    return () => {
      oauthServiceRef.current?.destroy();
    };
  }, []);

  // Reset state when component mounts/unmounts or source changes
  useEffect(() => {
    setOAuthState("idle");
    setAuthError(null);
    oauthServiceRef.current?.destroy();
  }, [source]);

  const handleAuthSuccess = (data: RemoteAuthDataFor<"oauth">) => {
    // Update the form with OAuth data
    form.setValue("data", {
      ...form.getValues().data,
      ...data,
    });
  };

  const handleAuthError = (error: string) => {
    console.error("OAuth error:", error);
    setAuthError(error);
  };

  const handleStateChange = (state: OAuthState) => {
    setOAuthState(state);
    if (state !== "error") {
      setAuthError(null);
    }
  };

  const handleOAuthFlow = async () => {
    if (!oauthServiceRef.current) {
      setAuthError("OAuth service not initialized");
      return;
    }

    const corsProxy = form.getValues()?.data.corsProxy;

    try {
      await oauthServiceRef.current.startOAuthFlow({
        source,
        corsProxy: corsProxy ?? undefined,
        onSuccess: handleAuthSuccess,
        onError: handleAuthError,
        onStateChange: handleStateChange,
      });
    } catch (error) {
      handleAuthError(error instanceof Error ? error.message : "Failed to initiate OAuth flow");
    }
  };

  const handleCancel = () => {
    oauthServiceRef.current?.cancelOAuthFlow();
    setAuthError(null);
    setOAuthState("idle");
    onCancel();
  };

  const isAuthenticating = oauthState === "authenticating";
  const authSuccess = oauthState === "success";

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

      {authError && (
        <div className="rounded-md bg-destructive p-4 text-destructive-foreground">
          <p className="mb-2 font-bold">Authorization Error</p>
          <p className="mb-2">{authError}</p>
        </div>
      )}

      {authSuccess && (
        <div className="rounded-md bg-success p-4 text-success-foreground">
          <p className="font-bold flex items-center gap-2">
            <span className="text-success bg-foreground rounded-full w-6 h-6 flex items-center justify-center p-1">
              <Check strokeWidth={4} />
            </span>
            Authorization Successful
          </p>
          <p className="text-sm mt-1">You can now save this connection.</p>
        </div>
      )}

      {!authSuccess && (
        <p className="text-sm text-muted-foreground">
          To connect to {source}, you will be redirected to the OAuth provider's login page in a popup window.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={handleCancel} className="w-full">
          Cancel
        </Button>

        {/* Edit mode: Show Save button only when not authenticated */}
        {mode === "edit" && !authSuccess && (
          <Button type="submit" variant="default" className="w-full">
            Save
          </Button>
        )}

        {/* Save button after authentication (both create and edit modes) */}
        {authSuccess && (
          <Button type="submit" variant="default" className="w-full">
            <RemoteAuthSourceIconComponent size={12} source={source} />
            Save
          </Button>
        )}

        {/* Connect button (both create and edit modes) */}
        {!authSuccess && (
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={handleOAuthFlow}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Authenticating...
              </>
            ) : (
              <>
                <RemoteAuthSourceIconComponent size={12} source={source} />
                Connect with {capitalizeFirst(source)}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
