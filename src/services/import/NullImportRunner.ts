import { absPath } from "@/lib/paths2";
import { GitHubImportRunner } from "@/services/import/GitHubImportRunner";
import { WorkspaceImportManifestType } from "@/services/import/manifest";

export class NullGithubImportRunner extends GitHubImportRunner {
  constructor() {
    super({
      fullRepoPath: "null/null",
    });
  }

  async run() {
    return absPath("/");
  }
  fetchManifest(): Promise<WorkspaceImportManifestType> {
    return Promise.resolve({
      version: 1,
      description: "Null import",
      type: "template",

      ident: "null/null",
      provider: "null",
      details: {
        url: "null://null",
      },
    });
  }
}

export const NULL_IMPORT_RUNNER = new NullGithubImportRunner();
