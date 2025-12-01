import type { VercelOAuthRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthVercelAgent } from "@/data/RemoteAuthVercelAgent";

export class RemoteAuthVercelOAuthAgent extends RemoteAuthVercelAgent {
  getCORSProxy(): string | undefined {
    return this.remoteAuth.data.corsProxy || undefined;
  }

  getUsername(): string {
    return "vercel-oauth";
  }

  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  async checkAuth(): Promise<boolean> {
    if (!this.remoteAuth.data.accessToken) return false;
    const expiresAt = this.remoteAuth.data.obtainedAt + this.remoteAuth.data.expiresIn * 1000;
    if (Date.now() >= expiresAt) {
      return false;
    }
    return true;
  }

  async reauth(): Promise<void> {
    if (!this.remoteAuth.data.refreshToken) {
      throw new Error("No refresh token available for reauthentication");
    }
    // TODO: Implement token refresh logic
    // This would typically involve calling the OAuth provider's token endpoint
    // with the refresh token to get a new access token
    console.warn("Token refresh not implemented yet");
  }

  constructor(private remoteAuth: VercelOAuthRemoteAuthDAO) {
    super();
  }
}
