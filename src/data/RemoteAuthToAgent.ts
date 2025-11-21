import {
  RemoteAuthBasicAuthAgent,
  RemoteAuthGithubAPIAgent,
  RemoteAuthGithubDeviceOAuthAgent,
  RemoteAuthGithubOAuthAgent,
  RemoteAuthNetlifyAgent,
  RemoteAuthNetlifyAPIAgent,
  RemoteAuthNetlifyOAuthAgent,
} from "@/data/RemoteAuthAgent";
import {
  isBasicAuthRemoteAuthDAO,
  isGithubAPIRemoteAuthDAO,
  isGithubDeviceOAuthRemoteAuthDAO,
  isGithubOAuthRemoteAuthDAO,
  isNetlifyAPIRemoteAuthDAO,
  isNetlifyOAuthRemoteAuthDAO,
  RemoteAuthDAO,
} from "@/data/RemoteAuthDAO";
import { IRemoteGitApiAgent } from "@/data/RemoteAuthTypes";
import { useMemo } from "react";

export function AgentFromRemoteAuth(remoteAuth?: RemoteAuthDAO | null) {
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
  throw new Error(`No RemoteAuthGitAgent for this type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}

export function useRemoteAuthAgent<
  T extends ReturnType<typeof AgentFromRemoteAuth> | RemoteAuthNetlifyAgent | IRemoteGitApiAgent,
>(remoteAuth?: RemoteAuthDAO | null) {
  return useMemo(() => AgentFromRemoteAuth(remoteAuth) as T, [remoteAuth]);
}
