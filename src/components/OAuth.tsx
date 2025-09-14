import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { RemoteAuthFormValues } from "@/components/RemoteAuthTemplate";
import { OptionalProbablyToolTip } from "@/components/SidebarFileMenu/sync-section/OptionalProbablyToolTips";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RemoteAuthOAuthRecordInternal, RemoteAuthSource } from "@/Db/RemoteAuth";
import {
  exchangeCodeForToken,
  generateCodeChallenge,
  generateCodeVerifier,
  getGithubOAuthUrl,
} from "@/lib/auth/GithubOAuthFlow";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { Channel } from "@/lib/channel";
import { Loader } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

const OAuthCbEvents = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
  AUTHORIZATION_CODE: "authorization_code" as const,
};

type OAuthCbEventPayload = {
  [OAuthCbEvents.SUCCESS]: RemoteAuthOAuthRecordInternal;
  [OAuthCbEvents.ERROR]: string;
  [OAuthCbEvents.AUTHORIZATION_CODE]: { code: string; state: string };
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
  const codeVerifierRef = useRef<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Reset OAuth state
  const resetOAuthState = () => {
    setIsAuthenticating(false);
    setAuthSuccess(false);
    setAuthError(null);
    authRef.current = null;
    codeVerifierRef.current = null;
  };

  // Reset state when component mounts (modal opens) and unmounts (modal closes)
  useEffect(() => {
    resetOAuthState();
    return () => {
      resetOAuthState();
    };
  }, []);

  const channelNameRef = useRef<string | null>(null);
  const channelRef = useRef<OAuthCbChannel | null>(null);

  const handleAuthSuccess = (data: RemoteAuthOAuthRecordInternal) => {
    authRef.current = data;
    setIsAuthenticating(false);
    setAuthSuccess(true);
    setAuthError(null);

    // Update the form with OAuth data
    form.setValue("data", {
      ...form.getValues().data,
      ...data,
    });
  };

  const handleAuthError = (error: string) => {
    console.error("OAuth error:", error);
    setIsAuthenticating(false);
    setAuthSuccess(false);
    setAuthError(error);
  };

  const handleOAuthFlow = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthSuccess(false);

    try {
      // Use simple fixed channel name and generate PKCE parameters
      const channelName = "oauth-callback";
      channelNameRef.current = channelName;

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      codeVerifierRef.current = codeVerifier;

      console.log("Parent: Creating channel with name:", channelName);

      // Create and initialize the channel
      const channel = new OAuthCbChannel(channelName);
      channelRef.current = channel;
      channel.init();

      // Set up channel listeners
      channel.on(OAuthCbEvents.SUCCESS, handleAuthSuccess);
      channel.on(OAuthCbEvents.ERROR, handleAuthError);

      // Handle authorization code from callback window
      channel.on(OAuthCbEvents.AUTHORIZATION_CODE, async ({ code, state }) => {
        console.log("Parent: Received authorization code from callback");

        try {
          if (!codeVerifierRef.current) {
            throw new Error("No code verifier available");
          }

          const corsProxy = form.getValues()?.data?.corsProxy;
          console.log("Parent: Starting token exchange with PKCE");

          // Do the token exchange in the main window with PKCE
          const authData = await exchangeCodeForToken({
            code,
            codeVerifier: codeVerifierRef.current,
            corsProxy: corsProxy ?? undefined,
          });

          const oauthData: RemoteAuthOAuthRecordInternal = {
            accessToken: authData.token,
            tokenType: "bearer",
            scope: state || "",
            obtainedAt: authData.obtainedAt,
            expiresIn: 0,
            refreshToken: "",
          };

          // Trigger success
          handleAuthSuccess(oauthData);
        } catch (error) {
          console.error("Parent: Token exchange failed:", error);
          handleAuthError(error instanceof Error ? error.message : "Token exchange failed");
        }
      });

      const state = nanoid();
      const redirectUri = `${window.location.origin}/auth/github`;

      const authUrl = getGithubOAuthUrl({
        redirectUri,
        state,
        codeChallenge,
        scopes: ["public_repo", "private_repo", "repo", "workflow"],
      });

      console.log("Parent: Opening popup with URL:", authUrl);

      // Open popup window
      const popup = window.open(authUrl, "oauth-popup", "width=600,height=700,scrollbars=yes,resizable=yes");

      // Check if popup was blocked
      if (!popup) {
        setIsAuthenticating(false);
        setAuthError("Popup was blocked. Please allow popups and try again.");
        channel.tearDown();
        return;
      }

      // Monitor popup for closure without completing auth
      const checkClosed = setInterval(() => {
        if (popup.closed && isAuthenticating) {
          clearInterval(checkClosed);
          setIsAuthenticating(false);
          if (!authSuccess && !authError) {
            setAuthError("Authorization was cancelled");
          }
          channel.tearDown();
        }
      }, 1000);
    } catch (error) {
      setIsAuthenticating(false);
      setAuthError("Failed to initiate OAuth flow");
      console.error("OAuth flow error:", error);
      if (channelRef.current) {
        channelRef.current.tearDown();
      }
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

      {authError && (
        <div className="rounded-md bg-destructive p-4 text-destructive-foreground">
          <p className="mb-2 font-bold">Authorization Error</p>
          <p className="mb-2">{authError}</p>
        </div>
      )}

      {authSuccess && (
        <div className="rounded-md bg-success p-4 text-success-foreground">
          <p className="font-bold flex items-center gap-2">
            <span className="text-green-500">✓</span> Authorization Successful
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
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetOAuthState();
            onCancel();
          }}
          className="w-full"
        >
          Cancel
        </Button>
        {authSuccess ? (
          <Button type="submit" variant="default" className="w-full">
            <RemoteAuthSourceIconComponent size={12} source={source} />
            Save Connection
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={handleOAuthFlow}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                {/* <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div> */}
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
