import {
  isBasicAuthRemoteAuthDAO,
  isGithubAPIRemoteAuthDAO,
  isGithubDeviceOAuthRemoteAuthDAO,
  isGithubOAuthRemoteAuthDAO,
  RemoteAuthDAO,
} from "@/data/RemoteAuth";
import {
  RemoteAuthBasicAuthAgent,
  RemoteAuthGithubAPIAgent,
  RemoteAuthGithubDeviceOAuthAgent,
  RemoteAuthGithubOAuthAgent,
} from "@/data/RemoteAuthAgent";

export function AgentFromRemoteAuth(remoteAuth: RemoteAuthDAO | null) {
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
  throw new Error(`No RemoteAuthGitAgent for this type: ${remoteAuth.type} source: ${remoteAuth.source}`);
}
