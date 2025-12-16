import { isRemoteGitApiAgent, RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import {
  isAWSAPIRemoteAuthDAO,
  isBasicAuthRemoteAuthDAO,
  isGithubAPIRemoteAuthDAO,
  isGithubDeviceOAuthRemoteAuthDAO,
  isGithubOAuthRemoteAuthDAO,
  isNetlifyAPIRemoteAuthDAO,
  isNetlifyOAuthRemoteAuthDAO,
  isVercelAPIRemoteAuthDAO,
  RemoteAuthDAO,
} from "@/workspace/RemoteAuthDAO";
import { RemoteAuthAWSAPIAgent } from "./RemoteAuthAWSAPIAgent";
import { RemoteAuthBasicAuthAgent } from "./RemoteAuthBasicAuthAgent";
import { RemoteAuthGithubAPIAgent } from "./RemoteAuthGithubAPIAgent";
import { RemoteAuthGithubDeviceOAuthAgent } from "./RemoteAuthGithubDeviceOAuthAgent";
import { RemoteAuthGithubOAuthAgent } from "./RemoteAuthGithubOAuthAgent";
import { RemoteAuthNetlifyAPIAgent } from "./RemoteAuthNetlifyAPIAgent";
import { RemoteAuthNetlifyOAuthAgent } from "./RemoteAuthNetlifyOAuthAgent";
import { RemoteAuthVercelAPIAgent } from "./RemoteAuthVercelAPIAgent";

import { DeployBundle, DeployBundleBase } from "@/services/deploy/DeployBundle";
import { useMemo } from "react";
import { RemoteAuthAgentSearchType } from "../useFuzzySearchQuery";

export function GitAgentFromRemoteAuth(remoteAuth: RemoteAuthDAO) {
  const agent = AgentFromRemoteAuthFactory(remoteAuth);
  if (!isRemoteGitApiAgent(agent)) {
    throw new TypeError("AgentFromRemoteAuth(RemoteAuthDAO) does not satisfy RemoteGitApiAgent");
  }
  return agent;
}

export function DeployableAuthAgentFromRemoteAuth(remoteAuth: null): null;
export function DeployableAuthAgentFromRemoteAuth<TBundle extends DeployBundle>(
  remoteAuth: RemoteAuthDAO
): RemoteAuthAgentDeployableFiles<TBundle>;
export function DeployableAuthAgentFromRemoteAuth<TBundle extends DeployBundle>(
  remoteAuth: RemoteAuthDAO | null
): RemoteAuthAgentDeployableFiles<TBundle> | null {
  if (!remoteAuth) {
    return null;
  }
  if (isGithubAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubAPIAgent(remoteAuth);
  }
  if (isGithubOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubOAuthAgent(remoteAuth);
  }
  if (isGithubDeviceOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubDeviceOAuthAgent(remoteAuth);
  }

  if (isBasicAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthBasicAuthAgent(remoteAuth);
  }
  if (isNetlifyAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthNetlifyAPIAgent(remoteAuth);
  }
  if (isNetlifyOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthNetlifyOAuthAgent(remoteAuth);
  }
  if (isVercelAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthVercelAPIAgent(remoteAuth);
  }
  if (isAWSAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthAWSAPIAgent(remoteAuth);
  }

  throw new Error(`No Agent for this type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}

export function AgentFromRemoteAuthFactory<T extends RemoteAuthDAO>(
  remoteAuth: T | null
): (RemoteAuthAgent & RemoteAuthAgentSearchType<any>) | null {
  if (!remoteAuth) {
    return null;
  }
  if (isGithubAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubAPIAgent(remoteAuth);
  }
  if (isGithubOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubOAuthAgent(remoteAuth);
  }
  if (isGithubDeviceOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthGithubDeviceOAuthAgent(remoteAuth);
  }

  if (isBasicAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthBasicAuthAgent(remoteAuth);
  }
  if (isNetlifyAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthNetlifyAPIAgent(remoteAuth);
  }
  if (isNetlifyOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthNetlifyOAuthAgent(remoteAuth);
  }
  if (isVercelAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthVercelAPIAgent(remoteAuth);
  }
  // if (isCloudflareAPIRemoteAuthDAO(remoteAuth)) {
  //   return new RemoteAuthCloudflareAPIAgent(remoteAuth);
  // }
  // if (isVercelOAuthRemoteAuthDAO(remoteAuth)) {
  //   return new RemoteAuthVercelOAuthAgent(remoteAuth);
  // }
  if (isAWSAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthAWSAPIAgent(remoteAuth);
  }

  throw new Error(`No Agent for this type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}

export function useRemoteAuthAgent<T extends ReturnType<typeof AgentFromRemoteAuthFactory>>(
  remoteAuth: RemoteAuthDAO | null
) {
  return useMemo(() => AgentFromRemoteAuthFactory(remoteAuth) as T, [remoteAuth]);
}
export interface RemoteAuthAgentDeployableFiles<TBundle extends DeployBundleBase> extends RemoteAuthAgent {
  deployFiles(bundle: TBundle, destination: any, logStatus?: (status: string) => void): Promise<unknown>;
  getDestinationURL(destination: any): Promise<string>;
}

export class NullRemoteAuthAgentDeployableFiles implements RemoteAuthAgentDeployableFiles<DeployBundleBase> {
  getApiToken(): string {
    return "";
  }
  getUsername(): string {
    return "null-remote-auth";
  }
  async deployFiles(): Promise<unknown> {
    throw new Error("Cannot deploy: Remote connection is missing or invalid");
  }
  async getDestinationURL(destination: any) {
    return "about:blank";
  }
  test() {
    return Promise.resolve({ status: "error" as const, msg: "No remote auth configured" });
  }
}
const NULL_AUTH_AGENT_DEPLOYABLE_FILES = new NullRemoteAuthAgentDeployableFiles();
