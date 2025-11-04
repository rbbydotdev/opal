import { RemoteAuthOAuthRecordInternal } from "@/data/RemoteAuthTypes";
import { getNetlifyOAuthUrl } from "@/lib/auth/NetlifyOAuthFlow";
import { OAuthCbChannel, OAuthCbEvents, OAuthProvider, OAuthProviderConfig } from "./OAuthProvider";

export class NetlifyOAuthProvider extends OAuthProvider {
  constructor() {
    super("netlify");
  }

  getAuthorizationUrl(config: OAuthProviderConfig): string {
    return getNetlifyOAuthUrl({
      redirectUri: config.redirectUri,
      state: config.state,
    });
  }

  setupChannelListeners(
    channel: OAuthCbChannel,
    config: OAuthProviderConfig,
    onSuccess: (data: RemoteAuthOAuthRecordInternal) => void,
    onError: (error: string) => void
  ): void {
    // Handle access token from callback window (implicit flow)
    void channel.once(OAuthCbEvents.ACCESS_TOKEN, async ({ accessToken, state }) => {
      try {
        const authData = await this.validateAndProcessAuth({ accessToken, state }, config);
        onSuccess(authData);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Failed to process access token");
      }
    });
  }

  async validateAndProcessAuth(
    data: { accessToken: string; state: string },
    config: OAuthProviderConfig
  ): Promise<RemoteAuthOAuthRecordInternal> {
    // For Netlify, we could validate the token here if needed
    // const validation = await validateNetlifyToken({ accessToken: data.accessToken });

    return {
      accessToken: data.accessToken,
      tokenType: "bearer",
      scope: data.state || "",
      obtainedAt: Date.now(),
      expiresIn: 0,
      refreshToken: "",
    };
  }
}
