import type { NetlifyOAuthRemoteAuthDAO } from "@/data/dao/RemoteAuthDAO";
import { RemoteAuthNetlifyAgent } from "@/data/remote-auth/RemoteAuthNetlifyAgent";

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
