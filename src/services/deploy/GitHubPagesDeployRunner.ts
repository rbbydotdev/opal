import {
  RemoteAuthGithubAPIAgent,
  RemoteAuthGithubDeviceOAuthAgent,
  RemoteAuthGithubOAuthAgent,
} from "@/data/RemoteAuthAgent";
import { coerceString, coerceUint8Array } from "@/lib/coerceUint8Array";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { isStringish, resolveFromRoot } from "@/lib/paths2";
import { Octokit } from "@octokit/core";
import { DeployResult, DeployRunner, DeployRunnerOptions } from "./DeployRunner";
import { GitHubPagesDeployData } from "./DeployTypes";

export interface GitHubPagesDeployRunnerOptions extends DeployRunnerOptions<GitHubPagesDeployData> {
  destination: RemoteAuthGithubAPIAgent | RemoteAuthGithubOAuthAgent | RemoteAuthGithubDeviceOAuthAgent;
  owner: string;
  repo: string;
  branch: string; // default: gh-pages
  createRepoIfNotExists?: boolean;
}

export class GitHubPagesDeployRunner extends DeployRunner<GitHubPagesDeployData> {
  private octokit!: Octokit;

  constructor(options: GitHubPagesDeployRunnerOptions) {
    super({
      ...options,
      destinationType: "github",
      destinationName: options.destinationName || `GitHub Pages (${options.owner}/${options.repo})`,
      data: options.data || {
        deployUrl: `https://${options.owner}.github.io/${options.repo}`,
        owner: options.owner || "",
        repo: options.repo || "",
        branch: options.branch || "gh-pages",
        pagesEnabled: false,
      },
    });

    if (this.destination) {
      this.octokit = (this.destination as any).octokit;
    }
  }

  protected getDestinationName(): string {
    const options = this.options as GitHubPagesDeployRunnerOptions;
    return `GitHub Pages (${options.owner}/${options.repo})`;
  }

  protected async performDeploy(): Promise<DeployResult<GitHubPagesDeployData>> {
    if (!this.octokit) {
      throw new Error("GitHub client not initialized - destination required");
    }

    await this.validateBuildOutput();

    try {
      const options = this.options as GitHubPagesDeployRunnerOptions;
      const { owner, repo, branch = "gh-pages" } = options;

      if (!owner || !repo) {
        throw new Error("GitHub owner and repo must be specified");
      }

      // Ensure repository exists
      this.log(`Checking repository: ${owner}/${repo}`, "info");
      await this.ensureRepositoryExists(owner, repo, options.createRepoIfNotExists || false);

      // Enable GitHub Pages if not already enabled
      this.log("Checking GitHub Pages settings...", "info");
      await this.ensureGitHubPagesEnabled(owner, repo, branch);

      // Collect files for deployment
      this.log("Collecting files for deployment...", "info");
      const files = await this.collectBuildFiles();
      this.log(`Found ${files.length} files to deploy`, "info");

      // Deploy to GitHub Pages branch
      this.log(`Deploying to ${branch} branch...`, "info");
      const commitResult = await this.deployToGitHubPages(owner, repo, branch, files);

      const pagesUrl = `https://${owner}.github.io/${repo}`;
      this.log("Deployment completed successfully!", "success");

      const deployData: GitHubPagesDeployData = {
        deployUrl: pagesUrl,
        owner: owner,
        repo: repo,
        branch: branch,
        commitSha: commitResult.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${commitResult.sha}`,
        pagesEnabled: true,
      };

      return {
        success: true,
        data: deployData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async ensureRepositoryExists(owner: string, repo: string, createIfNotExists: boolean): Promise<void> {
    try {
      await this.octokit.request("GET /repos/{owner}/{repo}", {
        owner,
        repo,
      });
      this.log(`Repository ${owner}/${repo} exists`, "info");
    } catch (error: any) {
      if (error.status === 404 && createIfNotExists) {
        this.log(`Creating repository: ${owner}/${repo}`, "info");
        await this.octokit.request("POST /user/repos", {
          name: repo,
          private: false, // GitHub Pages requires public repos for free accounts
          description: "Deployed from webeditor",
          auto_init: false,
        });
        this.log(`Repository created: ${owner}/${repo}`, "success");
      } else {
        throw new Error(
          `Repository ${owner}/${repo} not found. ${createIfNotExists ? "Failed to create." : "Set createRepoIfNotExists to true to create it automatically."}`
        );
      }
    }
  }

  private async ensureGitHubPagesEnabled(owner: string, repo: string, branch: string): Promise<void> {
    try {
      // Check if GitHub Pages is already configured
      const pagesInfo = await this.octokit.request("GET /repos/{owner}/{repo}/pages", {
        owner,
        repo,
      });

      this.log(`GitHub Pages already enabled on branch: ${pagesInfo.data.source?.branch}`, "info");

      // If it's using a different branch, warn the user
      if (pagesInfo.data.source?.branch !== branch) {
        this.log(
          `Warning: GitHub Pages is configured for branch '${pagesInfo.data.source?.branch}', but deploying to '${branch}'`,
          "warning"
        );
      }
    } catch (error: any) {
      if (error.status === 404) {
        // Pages not enabled, try to enable it
        this.log(`Enabling GitHub Pages on branch: ${branch}`, "info");
        try {
          await this.octokit.request("POST /repos/{owner}/{repo}/pages", {
            owner,
            repo,
            source: {
              branch,
              path: "/",
            },
          });
          this.log("GitHub Pages enabled successfully", "success");
        } catch (_enableError: any) {
          // Pages might be enabled automatically after we push to the branch
          this.log(`Note: GitHub Pages will be enabled automatically after deployment`, "info");
        }
      } else {
        throw error;
      }
    }
  }

  private async collectBuildFiles(): Promise<{ path: string; content: string; encoding: "utf-8" | "base64" }[]> {
    return Promise.all(
      [...this.buildDisk.fileTree.root.deepCopy().iterator((node: TreeNode) => node.isTreeFile())].map(
        async (node) => ({
          path: resolveFromRoot(this.buildOutputPath!, node.path),
          content: isStringish(node.path)
            ? coerceString(await this.buildDisk.readFile(node.path))
            : btoa(String.fromCharCode(...coerceUint8Array(await this.buildDisk.readFile(node.path)))),
          encoding: isStringish(node.path) ? "utf-8" : "base64",
        })
      )
    );
  }

  private async deployToGitHubPages(
    owner: string,
    repo: string,
    branch: string,
    files: { path: string; content: string; encoding: "utf-8" | "base64" }[]
  ): Promise<{ sha: string; url: string }> {
    // Get current branch reference or create if it doesn't exist
    let branchRef: any;
    try {
      branchRef = await this.octokit.request("GET /repos/{owner}/{repo}/git/refs/heads/{branch}", {
        owner,
        repo,
        branch,
      });
      this.log(`Found existing ${branch} branch`, "info");
    } catch (error: any) {
      if (error.status === 404) {
        this.log(`Creating ${branch} branch...`, "info");

        // Get the default branch to base the new branch on
        const repoInfo = await this.octokit.request("GET /repos/{owner}/{repo}", {
          owner,
          repo,
        });

        const defaultBranchRef = await this.octokit.request("GET /repos/{owner}/{repo}/git/refs/heads/{branch}", {
          owner,
          repo,
          branch: repoInfo.data.default_branch,
        });

        branchRef = await this.octokit.request("POST /repos/{owner}/{repo}/git/refs", {
          owner,
          repo,
          ref: `refs/heads/${branch}`,
          sha: defaultBranchRef.data.object.sha,
        });
        this.log(`Created ${branch} branch`, "success");
      } else {
        throw error;
      }
    }

    const currentSha = branchRef.data.object.sha;

    // Create tree with all files
    this.log("Creating git tree...", "info");
    const tree = await this.octokit.request("POST /repos/{owner}/{repo}/git/trees", {
      owner,
      repo,
      tree: files.map((file) => ({
        ...file,
        mode: "100644" as const,
        type: "blob" as const,
      })),
    });

    // Create commit
    this.log("Creating commit...", "info");
    const commit = await this.octokit.request("POST /repos/{owner}/{repo}/git/commits", {
      owner,
      repo,
      message: `Deploy from webeditor - ${new Date().toISOString()}`,
      tree: tree.data.sha,
      parents: [currentSha],
    });

    // Update branch reference
    this.log(`Updating ${branch} branch...`, "info");
    await this.octokit.request("PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}", {
      owner,
      repo,
      branch,
      sha: commit.data.sha,
    });

    this.log("Files pushed to GitHub Pages branch successfully", "success");

    return {
      sha: commit.data.sha,
      url: commit.data.html_url,
    };
  }
}
