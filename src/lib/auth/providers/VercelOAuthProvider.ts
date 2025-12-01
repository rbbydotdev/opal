import { RemoteAuthDataFor } from "@/data/RemoteAuthTypes";
import { exchangeCodeForToken, getVercelOAuthUrl } from "@/lib/auth/VercelOAuthFlow";
import { generateCodeChallenge, generateCodeVerifier } from "@/lib/auth/oauth-utils";
import { OAuthProvider, OAuthProviderConfig } from "./OAuthProvider";

export class VercelOAuthProvider extends OAuthProvider {
  private codeVerifier: string | null = null;

  constructor() {
    super("vercel");
  }

  async getAuthorizationUrl(config: OAuthProviderConfig): Promise<string> {
    this.codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(this.codeVerifier);
    const nonce = generateCodeVerifier(); // Generate secure random nonce

    return getVercelOAuthUrl({
      redirectUri: config.redirectUri,
      state: config.state,
      nonce,
      codeChallenge,
      scopes: ["openid", "email", "profile", "projects"],
    });
  }

  async validateAndProcessAuth(
    data: { code: string; state: string },
    config: OAuthProviderConfig
  ): Promise<RemoteAuthDataFor<"oauth">> {
    if (!this.codeVerifier) {
      throw new Error("No code verifier available");
    }

    const authData = await exchangeCodeForToken({
      code: data.code,
      redirectUri: config.redirectUri,
      codeVerifier: this.codeVerifier,
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
