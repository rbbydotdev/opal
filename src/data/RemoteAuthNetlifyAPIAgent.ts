import type { NetlifyAPIRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthNetlifyAgent } from "@/data/RemoteAuthNetlifyAgent";

export class RemoteAuthNetlifyAPIAgent extends RemoteAuthNetlifyAgent {
  getUsername(): string {
    return "netlify-api";
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  constructor(private remoteAuth: NetlifyAPIRemoteAuthDAO) {
    super();
  }
}
