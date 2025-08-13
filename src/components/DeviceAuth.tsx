import { AdapterTemplate } from "@/components/ConnectionsModal";
import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RemoteAuthDAO, RemoteAuthGithubDeviceOAuthRecordInternal } from "@/Db/RemoteAuth";
import { GithubDeviceAuthFlow } from "@/lib/auth/GithubDeviceAuthFlow";
import { unwrapError } from "@/lib/errors";
import { NotEnv } from "@/lib/notenv";
import { CheckCircle2Icon, ExternalLink, Loader } from "lucide-react";
import { useRef, useState } from "react";

export function DeviceAuth({
  form,
  selectedConnection,
  onSuccess,
  onCancel,
  mode,
  editConnection,
}: {
  form?: any; // UseFormReturn<DeviceAuthFormValues> - optional for backward compatibility
  selectedConnection: AdapterTemplate;
  onSuccess: (remoteAuth: RemoteAuthDAO) => void;
  onCancel: () => void;
  mode?: "add" | "edit";
  editConnection?: {
    guid: string;
    name: string;
    type: string;
    authType: "api" | "oauth" | "device";
  };
}) {
  const [state, setState] = useState<
    "idle" | "pin-loading" | "pin-loaded" | "auth-success" | "pending-rad-save" | "error"
  >("idle");
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const remoteAuthRef = useRef<RemoteAuthGithubDeviceOAuthRecordInternal | null>(null);
  const [corsProxy, setCorsProxy] = useState<string>(NotEnv.GithubApiProxy || "");
  const [error, setError] = useState<string | null>(null);
  const [apiName, setApiName] = useState<string>(
    form ? form.getValues()?.name || editConnection?.name || "my-gh-auth" : "my-gh-auth"
  );

  async function handleSave() {
    setState("pending-rad-save");
    try {
      let remoteAuth: RemoteAuthDAO;
      if (mode === "edit" && editConnection) {
        const dao = RemoteAuthDAO.FromJSON({
          guid: editConnection.guid,
          authType: "github-device-oauth",
          tag: apiName,
          data: remoteAuthRef.current!,
        });
        await dao.save();
        remoteAuth = dao;
      } else {
        remoteAuth = await RemoteAuthDAO.Create("github-device-oauth", apiName, remoteAuthRef.current!);
      }

      if (form) {
        form.setValue("name", apiName);
      }

      setState("idle");
      onSuccess(remoteAuth);
    } catch (error) {
      console.error("Error saving device auth:", error);
      setState("error");
      setError("Failed to save authentication");
    }
  }

  async function handleGithubDeviceAuth() {
    setError(null);
    setState("pin-loading");
    setPin("");
    try {
      await GithubDeviceAuthFlow({
        corsProxy,
        onVerification: (data) => {
          setVerificationUri(data.verification_uri);
          setPin(data.user_code);
          setState("pin-loaded");
        },
        onAuthentication: async (auth) => {
          // remoteAuthRef.current = await RemoteAuthDAO.Create("github-device-oauth", apiName, );
          remoteAuthRef.current = {
            accessToken: auth.token,
            login: auth.login,
            obtainedAt: Date.now(),
          };
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
      {form ? (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Connection Name"
                  onChange={(e) => {
                    field.onChange(e);
                    setApiName(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormItem>
          <FormLabel className="text-sm font-medium">Connection Name</FormLabel>
          <Input
            type="text"
            placeholder="API Name"
            value={apiName}
            onChange={(e) => setApiName(e.target.value)}
            className="w-full"
            required
          />
        </FormItem>
      )}
      <FormItem>
        <FormLabel className="text-sm font-medium">
          Github CORS Proxy URL (optional) <OptionalProbablyToolTip />
        </FormLabel>
        <Input
          type="text"
          placeholder="CORS Proxy URL"
          value={corsProxy}
          onChange={(e) => setCorsProxy(e.target.value)}
          className="w-full"
        />
      </FormItem>

      {state === "error" && (
        <div className="rounded-md bg-destructive p-4 text-destructive-foreground">
          <p className="mb-2 font-bold">Error</p>
          <p className="mb-2">{error}</p>
          {/* <Button type="button" onClick={handleRetry} variant={"outline"} className="text-destructive">
            Retry
          </Button> */}
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
              Navigate to {selectedConnection.name.split(" ")[0]}
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
        <div className="rounded-md bg-success p-4 text-success-foreground text-sm ">
          <div className="font-bold flex justify-start items-center gap-2  ">
            <CheckCircle2Icon size={12} /> Authentication Successful
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {(state === "auth-success" || state === "pending-rad-save") && (
          <Button type="button" variant="default" onClick={handleSave}>
            {state === "pending-rad-save" && <Loader size={12} className="animate-spin animation-iteration-infinite" />}
            OK
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
              {selectedConnection.icon}
              Go to {selectedConnection.name.split(" ")[0]}
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
