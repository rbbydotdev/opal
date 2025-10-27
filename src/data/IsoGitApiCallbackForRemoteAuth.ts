import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthAgentForRemoteAuth } from "./RemoteAuthAgentForRemoteAuth";

export function IsoGitApiCallbackForRemoteAuth(remoteAuth: RemoteAuthDAO) {
  const agent = RemoteAuthAgentForRemoteAuth(remoteAuth);
  return () => ({
    username: agent.getUsername(),
    password: agent.getApiToken(),
  });
}
