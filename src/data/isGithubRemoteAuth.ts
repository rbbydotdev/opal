import {
  GithubRemoteAuthDAO,
  isGithubAPIRemoteAuthDAO,
  isGithubDeviceOAuthRemoteAuthDAO,
  isGithubOAuthRemoteAuthDAO,
  RemoteAuthDAO,
} from "@/workspace/RemoteAuthDAO";

export function isGithubRemoteAuth(remoteAuth: RemoteAuthDAO): remoteAuth is GithubRemoteAuthDAO {
  return (
    isGithubAPIRemoteAuthDAO(remoteAuth) ||
    isGithubOAuthRemoteAuthDAO(remoteAuth) ||
    isGithubDeviceOAuthRemoteAuthDAO(remoteAuth)
  );
}
