import { RemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import { Octokit } from "@octokit/core";

export abstract class RemoteAuthGithubAgent implements RemoteGitApiAgent {
  private _octokit!: Octokit;
  get octokit() {
    return (
      this._octokit ||
      (this._octokit = new Octokit({
        auth: this.getApiToken(),
      }))
    );
  }

  onAuth = () => {
    return {
      username: this.getUsername(),
      password: this.getApiToken(),
    };
  };
  async createRepo(repoName: string, { signal }: { signal?: AbortSignal } = {}) {
    const finalRepoName = repoName.trim();
    return this.octokit.request("POST /user/repos", {
      name: finalRepoName,
      private: true,
      auto_init: false,
      request: {
        signal,
      },
    });
  }
  async getRemoteUsername(): Promise<string> {
    const user = await this.octokit.request("GET /user");
    return user.data.login;
  }

  async *fetchAll({ signal }: { signal?: AbortSignal } = {}): Promise<Repo[]> {
    const allRepos: Repo[] = [];
    let page = 1;
    const perPage = 10;

    while (true) {
      const response = await this.octokit.request("GET /user/repos", {
        page,
        per_page: perPage,
        affiliation: "owner,collaborator",
        headers: {
          "If-None-Match": "", // Force fresh response, bypass browser cache
        },
        request: { signal },
      });
      const linkHeader = response.headers.link;
      if (!linkHeader || !linkHeader.includes('rel="next"')) {
        break; // No more pages
      }

      // Add defensive check for response.data
      if (!Array.isArray(response.data)) {
        console.error("GitHub API returned unexpected response format:", response.data);
        throw new Error(`GitHub API returned unexpected response format. Expected array, got: ${typeof response.data}`);
      }

      const result = response.data.map(({ updated_at, id, name, full_name, description, html_url }) => ({
        updated_at: new Date(updated_at ?? Date.now()),
        id,
        name,
        full_name,
        description,
        html_url,
      }));
      yield result;
      allRepos.push(...result);

      page++;
    }

    return allRepos;
  }

  async hasUpdates(
    etag: string | null,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    try {
      const response = await this.octokit.request("GET /user/repos", {
        per_page: 1,
        headers: { "If-None-Match": etag ?? undefined },
        request: { signal },
      });

      return { updated: true, newEtag: response.headers.etag || null };
    } catch (error: any) {
      if (error.status === 304) {
        return { updated: false, newEtag: etag };
      }
      throw error;
    }
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      await this.octokit.request("GET /user");
      return { status: "success" };
    } catch (error: any) {
      return {
        status: "error",
        msg: `GitHub API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  abstract getUsername(): string;
  abstract getApiToken(): string;
}
