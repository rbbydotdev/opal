import {
  GithubRemoteAuthDAO,
  RemoteAuthDAO,
  isGithubAPIRemoteAuthDAO,
  isGithubDeviceOAuthRemoteAuthDAO,
  isGithubOAuthRemoteAuthDAO,
} from "@/data/RemoteAuthDAO";

export function isGithubRemoteAuth(remoteAuth: RemoteAuthDAO): remoteAuth is GithubRemoteAuthDAO {
  return (
    isGithubAPIRemoteAuthDAO(remoteAuth) ||
    isGithubOAuthRemoteAuthDAO(remoteAuth) ||
    isGithubDeviceOAuthRemoteAuthDAO(remoteAuth)
  );
}
