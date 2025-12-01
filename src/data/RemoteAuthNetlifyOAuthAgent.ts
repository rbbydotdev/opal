import type { NetlifyOAuthRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthNetlifyAgent } from "@/data/RemoteAuthNetlifyAgent";

export class RemoteAuthNetlifyOAuthAgent extends RemoteAuthNetlifyAgent {
  getUsername(): string {
    return "netlify-oauth";
  }

  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: NetlifyOAuthRemoteAuthDAO) {
    super();
  }
}
