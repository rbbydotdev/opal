import type { GithubDeviceOAuthRemoteAuthDAO } from "@/data/DAO/RemoteAuthDAO";
import { RemoteAuthGithubAgent } from "@/data/RemoteAuthGithubAgent";

export class RemoteAuthGithubDeviceOAuthAgent extends RemoteAuthGithubAgent {
  getUsername(): string {
    return "x-access-token";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: GithubDeviceOAuthRemoteAuthDAO) {
    super();
  }
}
