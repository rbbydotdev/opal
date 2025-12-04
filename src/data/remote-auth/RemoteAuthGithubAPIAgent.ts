import { RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import type { GithubAPIRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

export class RemoteAuthGithubAPIAgent extends RemoteAuthGithubAgent {
  getUsername = () => {
    return "x-access-token";
  };
  getApiToken = () => {
    return this.remoteAuth.data.apiKey;
  };
  constructor(private remoteAuth: GithubAPIRemoteAuthDAO) {
    super();
  }
}
