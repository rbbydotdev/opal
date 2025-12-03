import type { NetlifyAPIRemoteAuthDAO } from "@/data/DAO/RemoteAuthDAO";
import { RemoteAuthNetlifyAgent } from "@/data/remote-auth/RemoteAuthNetlifyAgent";

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
