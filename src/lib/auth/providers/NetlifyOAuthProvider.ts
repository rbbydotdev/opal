import { RemoteAuthDataFor } from "@/data/RemoteAuthTypes";
import { getNetlifyOAuthUrl } from "@/lib/auth/NetlifyOAuthFlow";
import { OAuthProvider, OAuthProviderConfig } from "./OAuthProvider";

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

  // Inherits setupChannelListeners from base OAuthProvider class

  async validateAndProcessAuth(
    data: { accessToken: string; state: string },
    config: OAuthProviderConfig
  ): Promise<RemoteAuthDataFor<"oauth">> {
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
