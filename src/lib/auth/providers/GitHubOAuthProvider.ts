import { RemoteAuthOAuthRecordInternal } from "@/data/RemoteAuthTypes";
import {
  exchangeCodeForToken,
  generateCodeChallenge,
  generateCodeVerifier,
  getGithubOAuthUrl,
} from "@/lib/auth/GithubOAuthFlow";
import { OAuthCbChannel, OAuthCbEvents, OAuthProvider, OAuthProviderConfig } from "./OAuthProvider";

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
      scopes: ["repo", "workflow"],
    });
  }

  setupChannelListeners(
    channel: OAuthCbChannel,
    config: OAuthProviderConfig,
    onSuccess: (data: RemoteAuthOAuthRecordInternal) => void,
    onError: (error: string) => void
  ): void {
    // Handle authorization code from callback window
    channel.once(OAuthCbEvents.AUTHORIZATION_CODE, async ({ code, state }) => {
      try {
        const authData = await this.validateAndProcessAuth({ code, state }, config);
        onSuccess(authData);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Token exchange failed");
      }
    });
  }

  async validateAndProcessAuth(
    data: { code: string; state: string },
    config: OAuthProviderConfig
  ): Promise<RemoteAuthOAuthRecordInternal> {
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
