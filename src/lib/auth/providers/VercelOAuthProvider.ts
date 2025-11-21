import { RemoteAuthDataFor } from "@/data/RemoteAuthTypes";
import { exchangeCodeForToken, getVercelOAuthUrl } from "@/lib/auth/VercelOAuthFlow";
import { OAuthProvider, OAuthProviderConfig } from "./OAuthProvider";

export class VercelOAuthProvider extends OAuthProvider {
  constructor() {
    super("vercel");
  }

  getAuthorizationUrl(config: OAuthProviderConfig): string {
    return getVercelOAuthUrl({
      redirectUri: config.redirectUri,
      state: config.state,
      scopes: ["user:read"],
    });
  }

  async validateAndProcessAuth(
    data: { code: string; state: string },
    config: OAuthProviderConfig
  ): Promise<RemoteAuthDataFor<"oauth">> {
    const authData = await exchangeCodeForToken({
      code: data.code,
      redirectUri: config.redirectUri,
      corsProxy: config.corsProxy,
    });

    return {
      accessToken: authData.accessToken,
      tokenType: authData.tokenType,
      scope: authData.scope,
      obtainedAt: authData.obtainedAt,
      expiresIn: authData.expiresIn || 0,
      refreshToken: authData.refreshToken || "",
    };
  }
}