import {
  RemoteAuthAWSAPIAgent,
  RemoteAuthBasicAuthAgent,
  RemoteAuthGithubAPIAgent,
  RemoteAuthGithubDeviceOAuthAgent,
  RemoteAuthGithubOAuthAgent,
  RemoteAuthNetlifyAPIAgent,
  RemoteAuthNetlifyOAuthAgent,
  RemoteAuthVercelAPIAgent,
} from "@/data/RemoteAuthAgent";
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
} from "@/data/RemoteAuthDAO";
import { isRemoteGitApiAgent } from "@/data/RemoteAuthTypes";

import { useMemo } from "react";

export function GitAgentFromRemoteAuth(remoteAuth: RemoteAuthDAO) {
  const agent = AgentFromRemoteAuth(remoteAuth);
  if (!isRemoteGitApiAgent(agent)) {
    throw new TypeError("AgentFromRemoteAuth(RemoteAuthDAO) does not satisfy RemoteGitApiAgent");
  }
  return agent;
}
export function AgentFromRemoteAuth<T extends RemoteAuthDAO>(remoteAuth?: T | null) {
  if (!remoteAuth) return null;

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
  throw new Error(`No RemoteAuthGitAgent for this type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}

export function useRemoteAuthAgent<T extends ReturnType<typeof AgentFromRemoteAuth>>(
  remoteAuth?: RemoteAuthDAO | null
) {
  return useMemo(() => AgentFromRemoteAuth(remoteAuth) as T, [remoteAuth]);
}
