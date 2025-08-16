import { Disk, NullDisk } from "@/Db/Disk";
import { GitRepo, MergeConflict } from "@/features/git-repo/GitRepo";
import { absPath, AbsPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import { Remote } from "comlink";
import * as git from "isomorphic-git";
import { MergeResult } from "isomorphic-git";

export const SYSTEM_COMMITS = {
  COMMIT: "opal / commit",
  SWITCH_BRANCH: "opal /  switch branch",
  SWITCH_COMMIT: "opal / switch commit",
  RENAME_BRANCH: "opal / rename branch",
  INIT: "opal / init",
  PREPUSH: "opal / prepush",
};

export class GitPlaybook {
  //should probably dep inject shared mutex from somewhere rather than relying on repo's
  //rather should share mutex
  constructor(
    private repo: GitRepo | Remote<GitRepo>,
    private mutex = new Mutex()
  ) {}

  switchBranch = async (branchName: string) => {
    if ((await this.repo.getCurrentBranch()) === branchName) return false;
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.SWITCH_BRANCH,
      });
    }
    await this.repo.checkoutRef(branchName);
    return true;
  };

  replaceGitBranch = async (symbolicRef: string, branchName: string) => {
    if (symbolicRef === branchName) return;
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({ message: SYSTEM_COMMITS.RENAME_BRANCH });
    }
    await this.repo.addGitBranch({ branchName, symbolicRef });
    await this.repo.deleteGitBranch(symbolicRef);
    await this.repo.checkoutRef(branchName);
  };

  resetToHead = async () => {
    return this.repo.checkoutRef("HEAD");
  };
  switchCommit = async (commitOid: string) => {
    await this.repo.rememberCurrentBranch();
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.SWITCH_COMMIT,
      });
    }
    await this.repo.checkoutRef(commitOid);
    return true;
  };
  async initialCommit() {
    await this.repo.mustBeInitialized();
    await this.repo.add(".");
    await this.repo.commit({
      message: "Initial commit",
    });
  }

  async merge(from: string, into: string): Promise<MergeResult | MergeConflict> {
    return this.repo.merge(from, into);
  }
  async addAllCommit({
    message,
    allowEmpty = false,
    filepath = ".",
  }: {
    message: string;
    filepath?: string;
    allowEmpty?: boolean;
  }) {
    await this.repo.mustBeInitialized();
    if (!allowEmpty && !(await this.repo.hasChanges())) {
      console.log("No changes to commit, skipping commit.");
      return false;
    }
    const statusMatrix = await this.repo.statusMatrix();

    for (const [filepath, head, workdir] of statusMatrix) {
      if (head && !workdir) {
        await this.repo.remove(filepath);
      }
    }
    await this.repo.add(filepath);
    await this.repo.commit({
      message,
    });
    return true;
  }

  newBranchFromCurrentOrphan = async () => {
    const prevBranch = (await this.repo.getPrevBranch()) ?? "unknown";
    const currentRef = await this.repo.currentRef();
    const newBranchName = `${prevBranch.replace("refs/heads/", "")}-${currentRef.slice(0, 6)}`;
    await this.repo.addGitBranch({ branchName: newBranchName, symbolicRef: currentRef, checkout: true });
    await this.addAllCommit({
      message: SYSTEM_COMMITS.SWITCH_BRANCH,
    });
    return newBranchName;
  };

  resetToPrevBranch = async () => {
    const prevBranch = await this.repo.getPrevBranch();
    if (prevBranch) {
      try {
        await this.repo.checkoutRef(prevBranch);
        return true;
      } catch (error) {
        if (error instanceof git.Errors.NotFoundError) {
          void this.repo.checkoutDefaultBranch();
        } else {
          console.error("Error switching to previous branch:", error);
        }
      }
    }
    return false;
  };
}
export class NullGitPlaybook extends GitPlaybook {
  constructor() {
    super(new NullRepo());
  }
}

export class NullRepo extends GitRepo {
  constructor() {
    super({ guid: "NullRepo", disk: new NullDisk(), dir: absPath("/"), defaultBranch: "main" });
    this.state.initialized = true;
  }

  static FromJSON = (_json: { guid: string; disk: Disk; dir: AbsPath; defaultBranch: string }): NullRepo => {
    return new NullRepo();
  };
}
