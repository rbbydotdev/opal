import {
  isAWSAPIRemoteAuthDAO,
  isBasicAuthRemoteAuthDAO,
  isGithubAPIRemoteAuthDAO,
  isGithubDeviceOAuthRemoteAuthDAO,
  isGithubOAuthRemoteAuthDAO,
  isNetlifyAPIRemoteAuthDAO,
  isNetlifyOAuthRemoteAuthDAO,
  isVercelAPIRemoteAuthDAO,
  isVercelOAuthRemoteAuthDAO,
  RemoteAuthDAO,
} from "@/data/DAO/RemoteAuthDAO";
import { isRemoteGitApiAgent, RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { RemoteAuthAWSAPIAgent } from "./RemoteAuthAWSAPIAgent";
import { RemoteAuthBasicAuthAgent } from "./RemoteAuthBasicAuthAgent";
import { RemoteAuthGithubAPIAgent } from "./RemoteAuthGithubAPIAgent";
import { RemoteAuthGithubDeviceOAuthAgent } from "./RemoteAuthGithubDeviceOAuthAgent";
import { RemoteAuthGithubOAuthAgent } from "./RemoteAuthGithubOAuthAgent";
import { RemoteAuthNetlifyAPIAgent } from "./RemoteAuthNetlifyAPIAgent";
import { RemoteAuthNetlifyOAuthAgent } from "./RemoteAuthNetlifyOAuthAgent";
import { RemoteAuthVercelAPIAgent } from "./RemoteAuthVercelAPIAgent";
import { RemoteAuthVercelOAuthAgent } from "./RemoteAuthVercelOAuthAgent";

import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { useMemo } from "react";

export function GitAgentFromRemoteAuth(remoteAuth: RemoteAuthDAO) {
  const agent = AgentFromRemoteAuthFactory(remoteAuth);
  if (!isRemoteGitApiAgent(agent)) {
    throw new TypeError("AgentFromRemoteAuth(RemoteAuthDAO) does not satisfy RemoteGitApiAgent");
  }
  return agent;
}
export function AgentFromRemoteAuthFactory<T extends RemoteAuthDAO>(
  remoteAuth?: T | null
): (RemoteAuthAgent & RemoteAuthAgentSearchType<any>) | null {
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
  // if (isCloudflareAPIRemoteAuthDAO(remoteAuth)) {
  //   return new RemoteAuthCloudflareAPIAgent(remoteAuth);
  // }
  if (isVercelOAuthRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthVercelOAuthAgent(remoteAuth);
  }
  if (isAWSAPIRemoteAuthDAO(remoteAuth)) {
    return new RemoteAuthAWSAPIAgent(remoteAuth);
  }
  throw new Error(`No Agent for this type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}

export function useRemoteAuthAgent<T extends ReturnType<typeof AgentFromRemoteAuthFactory>>(
  remoteAuth?: RemoteAuthDAO | null
) {
  return useMemo(() => AgentFromRemoteAuthFactory(remoteAuth) as T, [remoteAuth]);
}
