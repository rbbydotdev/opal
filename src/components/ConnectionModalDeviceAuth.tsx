import { ConnectionType } from "@/components/ConnectionsModal";
import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Button } from "@/components/ui/button";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { GithubDeviceAuthFlow } from "@/lib/auth/GithubDeviceAuthFlow";
import { unwrapError } from "@/lib/errors";
import { NotEnv } from "@/lib/notenv";
import { CheckCircle2Icon, ExternalLink, Loader } from "lucide-react";
import { useRef, useState } from "react";

export function ConnectionModalDeviceAuth({
  selectedConnection,
  onCancel,
  onSuccess,
}: {
  selectedConnection: ConnectionType;

  onSuccess?: (rad: RemoteAuthDAO) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<"idle" | "pin-loading" | "pin-loaded" | "auth-success" | "error">("auth-success"); //("idle");
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const remoteAuthRef = useRef<RemoteAuthDAO | null>(null);
  const [corsProxy, setCorsProxy] = useState<string>(NotEnv.GithubCorsProxy || "");
  const [error, setError] = useState<string | null>(null);
  const [apiName, setApiName] = useState<string>(selectedConnection.name || "Github-API");

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
          remoteAuthRef.current = await RemoteAuthDAO.Create("gh-device-oauth", apiName, {
            accessToken: auth.token,
            obtainedAt: Date.now(),
          });
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
        {state === "auth-success" && (
          <Button type="button" variant="default" onClick={() => onSuccess?.(remoteAuthRef.current!)}>
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
