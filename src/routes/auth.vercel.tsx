import { RemoteAuthDataFor } from "@/data/RemoteAuthTypes";
import { Channel } from "@/lib/channel";
import { unwrapError } from "@/lib/errors";
import { createFileRoute } from "@tanstack/react-router";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";

const OAuthCbEvents = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
  AUTHORIZATION_CODE: "authorization_code" as const,
  CLOSE_WINDOW: "close_window" as const,
};

type OAuthCbEventPayload = {
  [OAuthCbEvents.SUCCESS]: RemoteAuthDataFor<"oauth">;
  [OAuthCbEvents.ERROR]: string;
  [OAuthCbEvents.AUTHORIZATION_CODE]: { code: string; state: string };
  [OAuthCbEvents.CLOSE_WINDOW]: void;
};

class OAuthCbChannel extends Channel<OAuthCbEventPayload> {}

export const Route = createFileRoute("/auth/vercel")({
  component: OAuthCallback,
});

function OAuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      const channelName = "oauth-callback";
      const channel = new OAuthCbChannel(channelName);
      channel.init();

      if (error) {
        const errorMsg = errorDescription || error;
        console.error("OAuth error:", error, errorDescription);

        await channel.emit(OAuthCbEvents.ERROR, errorMsg);

        setStatus("error");
        setError(errorMsg);
        return;
      }

      if (!code) {
        const errorMsg = "No authorization code received";
        console.error(errorMsg);

        await channel.emit(OAuthCbEvents.ERROR, errorMsg);

        setStatus("error");
        setError(errorMsg);
        return;
      }

      try {
        // Send the authorization code to parent window for token exchange
        await channel.emit(OAuthCbEvents.AUTHORIZATION_CODE, { code, state: state || "" });

        setStatus("processing");

        // Listen for parent's response
        channel.once(OAuthCbEvents.SUCCESS, () => {
          setStatus("success");
        });

        channel.once(OAuthCbEvents.ERROR, (errorMsg) => {
          setStatus("error");
          setError(errorMsg);
        });

        // Listen for parent telling us to close
        channel.once(OAuthCbEvents.CLOSE_WINDOW, () => {
          setTimeout(() => {
            window.close();
          }, 100);
        });

      } catch (e) {
        const errorMsg = unwrapError(e);
        console.error("Failed to send authorization code:", e);

        await channel.emit(OAuthCbEvents.ERROR, errorMsg);

        setStatus("error");
        setError(errorMsg);
      }
    };

    void handleOAuthCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        {status === "processing" && (
          <>
            <div className="flex justify-center items-center">
              <Loader className="animate-spin h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Completing OAuth...</h2>
            <p className="text-muted-foreground">Exchanging authorization code for access token...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h2 className="text-lg font-semibold mb-2 text-green-700">Success!</h2>
            <p className="text-muted-foreground">Authorization complete. This window will close automatically.</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 text-4xl mb-4">✗</div>
            <h2 className="text-lg font-semibold mb-2 text-red-700">Authorization Failed</h2>
            <p className="text-muted-foreground mb-2">{error}</p>
            <p className="text-sm text-muted-foreground">This window will close automatically.</p>
          </>
        )}
      </div>
    </div>
  );
}