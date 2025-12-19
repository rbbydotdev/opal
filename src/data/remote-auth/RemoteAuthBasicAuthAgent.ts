import { RemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import type { BasicAuthRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

export class RemoteAuthBasicAuthAgent implements RemoteGitApiAgent {
  getUsername(): string {
    return this.remoteAuth.data.username;
  }
  getApiToken(): string {
    return this.remoteAuth.data.password;
  }
  constructor(private remoteAuth: BasicAuthRemoteAuthDAO) {}
  onAuth(): { username: string; password: string } {
    return {
      username: this.getUsername(),
      password: this.getApiToken(),
    };
  }
  async fetchAll(): Promise<Repo[]> {
    console.warn("RemoteAuthBasicAuthAgent.fetchAll() is not implemented");
    return [];
  }

  // deployFiles, getDestinationURL
  deployFiles(): Promise<unknown> {
    console.warn("RemoteAuthBasicAuthAgent.deployFiles() is not implemented");
    return Promise.resolve();
  }
  async getDestinationURL() {
    console.warn("RemoteAuthBasicAuthAgent.getDestinationURL() is not implemented");
    return "";
  }

  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    console.warn("RemoteAuthBasicAuthAgent.hasUpdates() is not implemented");
    return Promise.resolve({ updated: false, newEtag: etag });
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    return {
      status: "error",
      msg: "Basic auth test not implemented",
    };
  }
}
