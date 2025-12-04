import { RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import type { GithubDeviceOAuthRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

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
