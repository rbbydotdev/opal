import { RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import type { GithubOAuthRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

export class RemoteAuthGithubOAuthAgent extends RemoteAuthGithubAgent {
  getUsername(): string {
    return "x-access-token";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: GithubOAuthRemoteAuthDAO) {
    super();
  }
}
