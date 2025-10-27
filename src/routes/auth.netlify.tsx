import { RemoteAuthOAuthRecordInternal } from "@/data/RemoteAuthTypes";
import { Channel } from "@/lib/channel";
import { unwrapError } from "@/lib/errors";
import { createFileRoute } from "@tanstack/react-router";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";

const OAuthCbEvents = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
  ACCESS_TOKEN: "access_token" as const,
};

type OAuthCbEventPayload = {
  [OAuthCbEvents.SUCCESS]: RemoteAuthOAuthRecordInternal;
  [OAuthCbEvents.ERROR]: string;
  [OAuthCbEvents.ACCESS_TOKEN]: { accessToken: string; state: string };
};

class OAuthCbChannel extends Channel<OAuthCbEventPayload> {}

export const Route = createFileRoute("/auth/netlify")({
  component: OAuthCallback,
});

function OAuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
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

      // For Netlify implicit flow, the access token is in the hash fragment
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");

      if (!accessToken) {
        const errorMsg = "No access token received";
        console.error(errorMsg);

        await channel.emit(OAuthCbEvents.ERROR, errorMsg);

        setStatus("error");
        setError(errorMsg);
        return;
      }

      try {
        // Send the access token to parent window
        await channel.emit(OAuthCbEvents.ACCESS_TOKEN, {
          accessToken,
          state: state || "",
        });

        setStatus("success");

        setTimeout(() => {
          window.close();
        }, 1_500);
      } catch (e) {
        const errorMsg = unwrapError(e);
        console.error("Failed to send access token:", e);

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
            <p className="text-muted-foreground">Processing Netlify authorization...</p>
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
