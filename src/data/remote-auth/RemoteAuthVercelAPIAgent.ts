import { RemoteAuthVercelAgent } from "@/data/remote-auth/RemoteAuthVercelAgent";
import type { VercelAPIRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

export class RemoteAuthVercelAPIAgent extends RemoteAuthVercelAgent {
  getCORSProxy(): string | undefined {
    return this.remoteAuth.data.corsProxy || undefined;
  }

  getUsername(): string {
    return "vercel-api";
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  checkAuth(): Promise<boolean> | boolean {
    return true; // API keys do not expire by default
  }
  reauth(): Promise<void> | void {
    // No reauth needed for API keys
  }

  constructor(private remoteAuth: VercelAPIRemoteAuthDAO) {
    super();
  }
}
