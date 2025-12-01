import type { VercelAPIRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthVercelAgent } from "@/data/RemoteAuthVercelAgent";

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

  constructor(private remoteAuth: VercelAPIRemoteAuthDAO) {
    super();
  }
}
