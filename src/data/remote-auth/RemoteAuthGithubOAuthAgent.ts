import type { GithubOAuthRemoteAuthDAO } from "@/data/DAO/RemoteAuthDAO";
import { RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";

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
