import type { GithubAPIRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthGithubAgent } from "@/data/RemoteAuthGithubAgent";

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
