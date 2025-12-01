import { RemoteAuthDataFor } from "@/data/RemoteAuthTypes";
import { exchangeCodeForToken, getGithubOAuthUrl } from "@/lib/auth/GithubOAuthFlow";
import { generateCodeChallenge, generateCodeVerifier } from "@/lib/auth/oauth-utils";
import { OAuthProvider, OAuthProviderConfig } from "./OAuthProvider";

export class GitHubOAuthProvider extends OAuthProvider {
  private codeVerifier: string | null = null;

  constructor() {
    super("github");
  }

  async getAuthorizationUrl(config: OAuthProviderConfig): Promise<string> {
    this.codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(this.codeVerifier);

    return getGithubOAuthUrl({
      redirectUri: config.redirectUri,
      state: config.state,
      codeChallenge,
      scopes: ["read:user", "repo", "workflow"],
    });
  }

  // Inherits setupChannelListeners from base OAuthProvider class

  async validateAndProcessAuth(
    data: { code: string; state: string },
    config: OAuthProviderConfig
  ): Promise<RemoteAuthDataFor<"oauth">> {
    if (!this.codeVerifier) {
      throw new Error("No code verifier available");
    }

    // Do the token exchange with PKCE
    const authData = await exchangeCodeForToken({
      code: data.code,
      codeVerifier: this.codeVerifier,
      corsProxy: config.corsProxy,
    });

    return {
      accessToken: authData.token,
      tokenType: "bearer",
      scope: data.state || "",
      obtainedAt: authData.obtainedAt,
      expiresIn: 0,
      refreshToken: "",
    };
  }
}
