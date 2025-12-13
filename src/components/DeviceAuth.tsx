import { GithubDeviceAuthFlow } from "@/auth/GithubDeviceAuthFlow";
import { RemoteAuthSourceIconComponent } from "@/components/remote-auth/RemoteAuthSourceIcon";
import { RemoteAuthFormValues } from "@/components/remote-auth/RemoteAuthTemplate";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RemoteAuthDataFor, RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { unwrapError } from "@/lib/errors/errors";
import { ConnectionsModalMode } from "@/types/ConnectionsModalTypes";
import { Check, ExternalLink, Loader } from "lucide-react";
import { useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

export function DeviceAuth({
  mode = "add",
  form,
  source,
  onCancel = () => {},
  children,
}: {
  mode?: ConnectionsModalMode;
  form: UseFormReturn<RemoteAuthFormValues<"oauth-device">>;
  source: RemoteAuthSource;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<
    "idle" | "pin-loading" | "pin-loaded" | "auth-success" | "pending-rad-save" | "error"
  >("idle");
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const remoteAuthRef = useRef<RemoteAuthDataFor<"oauth-device"> | null>(null);
  // Remove local corsProxy state - use form state instead
  const [error, setError] = useState<string | null>(null);

  async function handleGithubDeviceAuth() {
    setError(null);
    setState("pin-loading");
    setPin("");
    const formCorsProxy = form.getValues().data?.corsProxy;
    const scopes = form.getValues().data?.scope?.split(",") || ["read:user", "public_repo", "workflow"];
    try {
      await GithubDeviceAuthFlow({
        corsProxy: formCorsProxy || undefined,
        scopes,
        onVerification: (data) => {
          setVerificationUri(data.verification_uri);
          setPin(data.user_code);
          setState("pin-loaded");
        },
        onAuthentication: async (auth) => {
          remoteAuthRef.current = {
            accessToken: auth.token,
            login: auth.login,
            obtainedAt: Date.now(),
            scope: auth.scope,
            corsProxy: formCorsProxy, // Use form's corsProxy value
          };

          // Populate the form with the authentication data (same as OAuth component)
          if (form) {
            form.setValue("data", remoteAuthRef.current);
          }

          setState("auth-success");
        },
      });
    } catch (e) {
      setError(unwrapError(e));
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Connection Name</FormLabel>
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

      {children}

      {state === "error" && (
        <div className="rounded-md bg-destructive p-4 text-destructive-foreground">
          <p className="mb-2 font-bold">Error</p>
          <p className="mb-2">{error}</p>
        </div>
      )}
      {state === "pin-loaded" && (
        <div className="rounded-md bg-muted p-4">
          <p className="text-sm mb-2">
            <a
              className="hover:text-bold underline"
              href={verificationUri || "https://github.com/login/device"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Navigate to {source}
            </a>{" "}
            and enter the device PIN below to authenticate.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            {Array.from(pin).map((char, idx) => (
              <span
                key={idx}
                className="inline-flex items-center justify-center rounded-lg bg-background border px-2 py-1 text-xl font-mono font-bold"
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}
      {state === "auth-success" && (
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        {/* Edit mode: Show Update button only when not authenticated */}
        {mode === "edit" && state !== "auth-success" && state !== "pending-rad-save" && (
          <Button type="submit" variant="default">
            Save
          </Button>
        )}

        {/* Save/Update button after authentication (both create and edit modes) */}
        {(state === "auth-success" || state === "pending-rad-save") && (
          <Button type="submit" variant="default" disabled={state === "pending-rad-save"}>
            {state === "pending-rad-save" && <Loader size={12} className="animate-spin animation-iteration-infinite" />}
            Save
          </Button>
        )}

        {(state === "idle" || state === "error" || state === "pin-loading") && (
          <Button type="button" onClick={handleGithubDeviceAuth} disabled={state === "pin-loading"}>
            {state === "pin-loading" ? (
              <>
                <Loader size={12} className="animate-spin animation-iteration-infinite" />
                Load Device PIN
              </>
            ) : (
              "Load Device PIN"
            )}
          </Button>
        )}

        {state === "pin-loaded" && (
          <Button asChild type="button" className="flex items-center gap-2">
            <a href="https://github.com/login/device" target="_blank" rel="noopener noreferrer">
              <RemoteAuthSourceIconComponent source={source} size={16} />
              Go to {capitalizeFirst(source)}
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
