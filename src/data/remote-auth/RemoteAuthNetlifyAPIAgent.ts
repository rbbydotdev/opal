import { RemoteAuthNetlifyAgent } from "@/data/remote-auth/RemoteAuthNetlifyAgent";
import type { NetlifyAPIRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

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
