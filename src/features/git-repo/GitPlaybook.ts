import { Disk, NullDisk } from "@/Db/Disk";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { IsoGitApiCallbackForRemoteAuth } from "@/Db/RemoteAuthAgent";
import { GitRemote, GitRepo, MergeConflict } from "@/features/git-repo/GitRepo";
import { absPath, AbsPath } from "@/lib/paths2";
// import { Mutex } from "async-mutex";
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
    private repo: GitRepo | Remote<GitRepo>
    // private mutex = new Mutex()
  ) {}

  switchBranch = async (branchName: string) => {
    if ((await this.repo.getCurrentBranch()) === branchName) return false;
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.SWITCH_BRANCH,
      });
    }
    await this.repo.checkoutRef({ ref: branchName });
    return true;
  };

  resetHard = async ({ ref }: { ref: string }) => {
    const commitOid = await this.repo.resolveRef({ ref });
    const currentBranch = (await this.repo.getCurrentBranch({ fullname: true }))!;
    await this.repo.writeRef({ ref: currentBranch, value: commitOid, force: true });
    await this.repo.checkoutRef({
      ref: currentBranch,
      force: true,
    });
  };

  replaceGitBranch = async (symbolicRef: string, branchName: string) => {
    if (symbolicRef === branchName) return;
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({ message: SYSTEM_COMMITS.RENAME_BRANCH });
    }
    await this.repo.addGitBranch({ branchName, symbolicRef });
    await this.repo.deleteGitBranch(symbolicRef);
    await this.repo.checkoutRef({ ref: branchName });
  };

  resetToHead = async () => {
    const currentBranch = await this.repo.getCurrentBranch();
    return this.repo.checkoutRef({ ref: currentBranch ?? "HEAD" });
  };
  switchCommit = async (commitOid: string) => {
    await this.repo.rememberCurrentBranch();
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.SWITCH_COMMIT,
      });
    }
    await this.repo.checkoutRef({ ref: commitOid });
    return true;
  };
  async initialCommit() {
    await this.repo.mustBeInitialized();
    await this.repo.add(".");
    await this.repo.commit({
      message: "Initial commit",
    });
  }

  merge = async ({ from, into }: { from: string; into: string }): Promise<MergeResult | MergeConflict> => {
    const result = await this.repo.merge({ from, into });
    return result;
  };
  mergeCommit = async (): Promise<string | null> => {
    // const currentBranch = await this.repo.getCurrentBranch();
    const mergeHead = await this.repo.getMergeState();
    const mergeMsg = await this.repo.getMergeMsg();
    const head = await this.repo.getHead();
    if (!mergeHead || !head) {
      throw new Error("Cannot merge commit, no merge head or current branch found");
    }
    return this.addAllCommit({
      message: mergeMsg ?? "Merge commit",
      parent: [head, mergeHead],
    });
  };
  async addAllCommit({
    message,
    allowEmpty = false,
    filepath = ".",
    ref,
    parent,
  }: {
    message: string;
    filepath?: string;
    allowEmpty?: boolean;
    ref?: string;
    parent?: string[];
  }) {
    if (!allowEmpty && !(await this.repo.hasChanges())) {
      console.log("No changes to commit, skipping commit.");
      return null;
    }
    const statusMatrix = await this.repo.statusMatrix();

    for (const [filepath, head, workdir] of statusMatrix) {
      if (head && !workdir) {
        await this.repo.remove(filepath);
      }
    }
    await this.repo.add(filepath);
    return this.repo.commit({
      ref,
      message,
      parent,
    });
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
        await this.repo.checkoutRef({ ref: prevBranch });
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

  async fetchRemote(remote: string) {
    //if no master or main branch, create one
    // if (!(await this.repo.getBranch("main")) && !(await this.repo.getBranch("master"))) {
    //   await this.repo.addGitBranch({ branchName: "main", checkout: true });
    //   await this.initialCommit();
    // }
    const remoteObj = await this.repo.getRemote(remote);
    if (!remoteObj) {
      throw new Error(`Remote ${remote} not found`);
    }
    const { gitCorsProxy: corsProxy, RemoteAuth } = remoteObj;
    const onAuth = RemoteAuth?.toAgent()?.onAuth;
    console.log(onAuth?.());
    const result = await this.repo.fetch({
      url: remoteObj.url,
      corsProxy,
      onAuth,
    });
    return result;
  }

  async addRemoteAndFetch(remote: GitRemote) {
    //if no master or main branch, create one
    // if (!(await this.repo.getBranch("main")) && !(await this.repo.getBranch("master"))) {
    //   await this.repo.addGitBranch({ branchName: "main", checkout: true });
    //   await this.initialCommit();
    // }
    const currentBranches = await this.repo.getBranches();
    await this.repo.addGitRemote(remote);
    const RemoteAuth = remote.authId ? await RemoteAuthDAO.GetByGuid(remote.authId) : null;
    const onAuth = RemoteAuth?.toAgent()?.onAuth;
    const result = await this.repo.fetch({
      url: remote.url,
      corsProxy: remote.gitCorsProxy,
      onAuth,
    });
    console.log("Fetch result:", result);
    return result;
  }

  async push({ remote, ref }: { remote: string; ref: string }) {
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.PREPUSH,
      });
    }
    const remoteObj = await this.repo.getRemote(remote);
    if (!remoteObj) {
      throw new Error(`Remote ${remote} not found`);
    }
    if (remoteObj.authId && !remoteObj.RemoteAuth) {
      throw new Error(`Remote ${remote} has authId but no RemoteAuth object found`);
    }
    const { gitCorsProxy: corsProxy, RemoteAuth } = remoteObj;

    const onAuth = RemoteAuth ? IsoGitApiCallbackForRemoteAuth(RemoteAuth) : undefined;
    await this.repo.push({
      ref,
      remote,
      corsProxy,
      onAuth,
    });
  }
}
export class NullGitPlaybook extends GitPlaybook {
  constructor() {
    super(new NullRepo());
  }
}

export class NullRepo extends GitRepo {
  constructor() {
    super({ guid: "NullRepo", disk: new NullDisk(), dir: absPath("/"), defaultBranch: "main" });
    this.state.fullInitialized = true;
  }

  static FromJSON = (_json: { guid: string; disk: Disk; dir: AbsPath; defaultBranch: string }): NullRepo => {
    return new NullRepo();
  };
}
