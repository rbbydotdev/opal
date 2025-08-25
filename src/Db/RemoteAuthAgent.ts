import {
  BasicAuthRemoteAuthDAO,
  GithubAPIRemoteAuthDAO,
  GithubDeviceOAuthRemoteAuthDAO,
  GithubOAuthRemoteAuthDAO,
  isGithubAPIRemoteAuthDAO,
  isGithubDeviceOAuthRemoteAuthDAO,
  isGithubOAuthRemoteAuthDAO,
  RemoteAuthDAO,
} from "@/Db/RemoteAuth";
import { Octokit } from "@octokit/core";

export interface IRemoteAuthAgent {
  getUsername(): string;
  getApiToken(): string;
}

class RepoSearchResults {
  created = Date.now();
  results: any[] = [];
  fuzzysortedResults: Fuzzysort.KeysResults<any> | null = null;
}

export abstract class IRemoteAuthGithubAgent implements IRemoteAuthAgent {
  private _octokit!: Octokit;
  get octokit() {
    return (
      this._octokit ||
      (this._octokit = new Octokit({
        auth: this.getApiToken(),
      }))
    );
  }
  abstract getUsername(): string;
  abstract getApiToken(): string;

  async searchRepos(searchTerm?: string) {
    const result = await this.octokit.request("GET /user/repos", {
      per_page: 100,
      affiliation: "owner,collaborator", // repos you own OR can push to
      direction: "desc", // newest first
    });
    return result.data.items;
  }
}

export class RemoteAuthBasicAuthAgent {
  getUsername(): string {
    return this.remoteAuth.data.username;
  }
  getApiToken(): string {
    return this.remoteAuth.data.password;
  }
  constructor(private remoteAuth: BasicAuthRemoteAuthDAO) {}
}

export class RemoteAuthGithubOAuthAgent extends IRemoteAuthGithubAgent {
  getUsername(): string {
    return "";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: GithubOAuthRemoteAuthDAO) {
    super();
  }
}

export class RemoteAuthGithubAPIAgent extends IRemoteAuthGithubAgent {
  getUsername = () => {
    return "";
  };
  getApiToken = () => {
    return this.remoteAuth.data.apiKey;
  };
  constructor(private remoteAuth: GithubAPIRemoteAuthDAO) {
    super();
  }
}
export class RemoteAuthGithubDeviceOAuthAgent extends IRemoteAuthGithubAgent {
  getUsername(): string {
    return "";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: GithubDeviceOAuthRemoteAuthDAO) {
    super();
  }
}

export function IsoGitApiCallbackForRemoteAuth(remoteAuth: RemoteAuthDAO) {
  const agent = RemoteAuthAgentForRemoteAuth(remoteAuth);
  return () => ({
    username: agent.getUsername(),
    password: agent.getApiToken(),
  });
}

export type GithubRemoteAuthDAO = GithubAPIRemoteAuthDAO | GithubOAuthRemoteAuthDAO | GithubDeviceOAuthRemoteAuthDAO;

export function isGithubRemoteAuth(remoteAuth: RemoteAuthDAO): remoteAuth is GithubRemoteAuthDAO {
  return (
    isGithubAPIRemoteAuthDAO(remoteAuth) ||
    isGithubOAuthRemoteAuthDAO(remoteAuth) ||
    isGithubDeviceOAuthRemoteAuthDAO(remoteAuth)
  );
}

export function RemoteAuthAgentForRemoteAuth(remoteAuth: RemoteAuthDAO): IRemoteAuthAgent {
  if (isGithubAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubAPIAgent(remoteAuth);
  }
  if (isGithubOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubOAuthAgent(remoteAuth);
  }
  if (isGithubDeviceOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubDeviceOAuthAgent(remoteAuth);
  }
  throw new Error(`No RemoteAuthGitAgent for remoteAuth type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}

export function RemoteGithubAgentForRemoteAuth(remoteAuth: RemoteAuthDAO): IRemoteAuthGithubAgent {
  if (isGithubAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubAPIAgent(remoteAuth);
  }
  if (isGithubOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubOAuthAgent(remoteAuth);
  }
  if (isGithubDeviceOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubDeviceOAuthAgent(remoteAuth);
  }
  throw new Error(`No RemoteAuthGitAgent for remoteAuth type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}
