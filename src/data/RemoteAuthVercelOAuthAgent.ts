import type { VercelOAuthRemoteAuthDAO } from "@/data/DAO/RemoteAuthDAO";
import { RemoteAuthVercelAgent } from "@/data/RemoteAuthVercelAgent";
import { refreshVercelToken } from "@/lib/auth/VercelOAuthFlow";
import { TokenExpiredError } from "@/lib/errors";

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
      throw new TokenExpiredError("Authentication expired and no refresh token available");
    }

    try {
      const refreshedTokens = await refreshVercelToken({
        refreshToken: this.remoteAuth.data.refreshToken,
        corsProxy: this.remoteAuth.data.corsProxy,
      });

      // Update the stored token data
      this.remoteAuth.data.accessToken = refreshedTokens.accessToken;
      this.remoteAuth.data.obtainedAt = refreshedTokens.obtainedAt;
      this.remoteAuth.data.expiresIn = refreshedTokens.expiresIn || this.remoteAuth.data.expiresIn;
      if (refreshedTokens.refreshToken) {
        this.remoteAuth.data.refreshToken = refreshedTokens.refreshToken;
      }

      // Save the updated data
      await this.remoteAuth.save();
    } catch (error: any) {
      throw new TokenExpiredError(`Failed to refresh token: ${error.message}`);
    }
  }

  constructor(private remoteAuth: VercelOAuthRemoteAuthDAO) {
    super();
  }
}
