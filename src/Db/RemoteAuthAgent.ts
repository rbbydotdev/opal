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

export interface IRemoteAuthAgent {
  getUsername(): string;
  getApiToken(): string;
}

export interface IRemoteAuthGithubAgent extends IRemoteAuthAgent {}

export class RemoteAuthBasicAuthAgent {
  getUsername(): string {
    return this.remoteAuth.data.username;
  }
  getApiToken(): string {
    return this.remoteAuth.data.password;
  }
  constructor(private remoteAuth: BasicAuthRemoteAuthDAO) {}
}

export class RemoteAuthGithubOAuthAgent {
  getUsername(): string {
    return "";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }
  constructor(private remoteAuth: GithubOAuthRemoteAuthDAO) {}
}

export class RemoteAuthGithubAPIAgent {
  getUsername(): string {
    return "";
  }
  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }
  constructor(private remoteAuth: GithubAPIRemoteAuthDAO) {}
}
export class RemoteAuthGithubDeviceOAuthAgent {
  getUsername(): string {
    return "";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }
  constructor(private remoteAuth: GithubDeviceOAuthRemoteAuthDAO) {}
}

export function IsoGitApiCallbackForRemoteAuth(remoteAuth: RemoteAuthDAO) {
  const agent = RemoteAuthAgentForRemoteAuth(remoteAuth);
  return () => ({
    username: agent.getUsername(),
    password: agent.getApiToken(),
  });
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
