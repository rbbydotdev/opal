import { RemoteAuthAgentDeployableFiles } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { DeployBundle } from "@/services/deploy/DeployBundle";

class RemoteAuthNullAgent implements RemoteAuthAgentDeployableFiles<DeployBundle> {
  deployFiles(bundle: DeployBundle, destination: any, logStatus?: (status: string) => void): Promise<unknown> {
    return Promise.resolve();
  }
  getDestinationURL(destination: any): Promise<string> {
    return Promise.resolve("");
  }
  getUsername(): string {
    return "";
  }
  getApiToken(): string {
    return "";
  }
  test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    return Promise.resolve({ status: "error", msg: "NULL" });
  }
}
export const NULL_REMOTE_AUTH_AGENT = new RemoteAuthNullAgent();
