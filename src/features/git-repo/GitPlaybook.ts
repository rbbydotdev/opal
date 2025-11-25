import { Disk } from "@/data/disk/Disk";
import { GithubRemoteAuthDAO, RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { gitAbbreviateRef } from "@/features/git-repo/gitAbbreviateRef";
import { GitFullRemoteObjType, GitRemote, GitRepo } from "@/features/git-repo/GitRepo";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { absPath, AbsPath } from "@/lib/paths2";
// import { Mutex } from "async-mutex";
import { NullDisk } from "@/data/NullDisk";
import { GitAgentFromRemoteAuth } from "@/data/RemoteAuthToAgent";
import { Remote } from "comlink";
import * as git from "isomorphic-git";

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
    if (await this.repo.isMerging()) {
      throw new ConflictError("Cannot switch branches while a merge is in progress. Please complete the merge first.");
    }
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.SWITCH_BRANCH,
      });
    }
    await this.repo.checkoutRef({ ref: branchName, force: true });
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

  resetSoftParent = async () => {
    const commit = await this.repo.readCommitFromRef({ ref: "HEAD~1" }).catch(() => null);
    const parentOid = commit?.oid;
    if (!parentOid) {
      throw new NotFoundError("No parent commit found for HEAD~1");
    }
    const currentBranch = (await this.repo.getCurrentBranch({ fullname: true }))!;
    await this.repo.writeRef({ ref: currentBranch, value: parentOid, force: true });
  };

  replaceGitBranch = async (symbolicRef: string, branchName: string) => {
    if (symbolicRef === branchName) return;
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({ message: SYSTEM_COMMITS.RENAME_BRANCH });
    }
    await this.repo.addGitBranch({ branchName, symbolicRef });
    await this.repo.deleteGitBranch(symbolicRef);
    await this.repo.checkoutRef({ ref: branchName, force: true });
  };

  resetToHead = async () => {
    const currentBranch = await this.repo.getCurrentBranch();
    return this.repo.checkoutRef({ ref: currentBranch ?? "HEAD", force: true });
  };
  switchCommit = async (commitOid: string) => {
    await this.repo.rememberCurrentBranch();
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.SWITCH_COMMIT,
      });
    }
    await this.repo.checkoutRef({ ref: commitOid, force: true });
    return true;
  };

  async initialCommit(message = "Initial commit") {
    await this.repo.mustBeInitialized();
    await this.repo.add(".");
    await this.repo.commit({
      message,
    });
  }
  // async _____initialCommit() {
  //   await this.repo.mustBeInitialized();
  //   await this.repo.add(".");
  //   //if were are in a bare repo some special things need to be done
  //   //i think i need to create a slop branch for the working directory
  //   const branches = await this.repo.getBranches().catch(() => []);
  //   const main = gitAbbreviateRef(await this.repo.defaultMainBranch);
  //   const newBranch = getUniqueSlug(main, branches);

  //   await this.repo.addGitBranch({ branchName: newBranch });

  //   // First commit to create the initial commit
  //   const commitOid = await this.repo.commit({
  //     message: "Initial commit",
  //     // ref: newBranch,
  //   });

  //   // Now create the branch pointing to this commit
  //   await this.repo.addGitBranch({
  //     branchName: newBranch,
  //     symbolicRef: commitOid,
  //     checkout: false,
  //   });

  //   await this.repo.checkoutRef({ ref: newBranch, force: true });
  // }

  merge = this.repo.merge.bind(this);

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

    const newBranchName = `${gitAbbreviateRef(prevBranch)}-${currentRef.slice(0, 6)}`;
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
        await this.repo.checkoutRef({ ref: prevBranch, force: true });
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
    const remoteObj = await this.repo.getRemote(remote);
    if (!remoteObj) {
      throw new Error(`Remote ${remote} not found`);
    }
    const { gitCorsProxy: corsProxy, RemoteAuth } = remoteObj;

    const onAuth = RemoteAuth ? GitAgentFromRemoteAuth(RemoteAuth).onAuth : undefined;
    const result = await this.repo.fetch({
      remote: remoteObj.name,
      url: remoteObj.url,
      corsProxy,
      onAuth,
    });
    return result;
  }

  async initFromRemote(remote: GitRemote) {
    await this.repo.mustBeInitialized();
    //adding remote and fetching
    const result = await this.addRemoteAndFetch(remote);
    //determine default branch
    const defaultBranch = result.defaultBranch ?? "main";

    await this.repo.setDefaultBranch(defaultBranch);

    //if there are files around we need to save them in a commit
    //of the name default branch
    if (!(await this.repo.isCleanFs())) {
      const defaultBranchRef = await this.repo
        .resolveRef({ ref: defaultBranch })
        .catch(() => this.repo.addGitBranch({ branchName: gitAbbreviateRef(defaultBranch), checkout: true }));
      //branch does not exist we need to create initial commit
      //save current files in initial commit on default branch
      await this.repo.add(".");
      await this.repo.commit({
        message: "Initial commit",
        ref: defaultBranchRef,
      });
      console.log("Created initial commit on branch", defaultBranch);
      console.log(await this.repo.currentBranch());

      await this.repo.merge({
        from: `refs/remotes/${remote.name}/${gitAbbreviateRef(defaultBranch)}`,
        into: defaultBranch,
      });
    } else {
      //otherwise just checkout remote
      await this.repo.checkoutRef({
        ref: defaultBranch,
        remote: remote.name,
        force: true,
      });
    }
  }

  async addRemoteAndFetch(remote: GitRemote) {
    await this.repo.addGitRemote(remote);
    const remoteAuth = remote.authId ? await RemoteAuthDAO.GetByGuid(remote.authId) : null;
    const onAuth = remoteAuth ? GitAgentFromRemoteAuth(remoteAuth).onAuth : undefined;
    return await this.repo.fetch({
      remote: remote.name,
      url: remote.url,
      corsProxy: remote.gitCorsProxy,
      onAuth,
    });
  }

  async pull({ remote, ref }: { remote: string; ref?: string }) {
    const finalRef = ref || (await this.repo.currentBranch()) || null;
    if (!finalRef) throw new Error("No current branch to pull");
    const remoteObj = await this.repo.getRemote(remote);
    if (!remoteObj) throw new NotFoundError(`Remote ${remote} not found`);
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.PREPUSH,
      });
    }

    // First, fetch from the remote
    await this.repo.fetch({
      url: remoteObj.url,
      remote: remoteObj.name,
      corsProxy: remoteObj.gitCorsProxy,
      onAuth: remoteObj.onAuth,
    });

    // Then, merge the fetched branch with allowUnrelatedHistories
    const currentBranch = await this.repo.normalizeRef({ ref: finalRef });
    const remoteBranch = `${remoteObj.name}/${await this.repo.toShortBranchName(finalRef)}`;

    return this.merge({
      from: remoteBranch,
      into: currentBranch,
    });
  }

  async pushRemoteAuth({
    url,
    remoteAuth,
    force,
    gitCorsProxy,
    ref,
  }: {
    url: string;
    remoteAuth: GithubRemoteAuthDAO;
    ref?: string;
    gitCorsProxy?: string;
    force?: boolean;
  }) {
    const remoteObj = GitRepo.GitFullRemoteObj(
      {
        name: "origin",
        url,
        gitCorsProxy,
      },
      remoteAuth
    );
    return this.push({ remote: remoteObj, force, ref });
  }
  async push({ remote, force, ref }: { remote: string | GitFullRemoteObjType; force?: boolean; ref?: string }) {
    if (await this.repo.hasChanges()) {
      await this.addAllCommit({
        message: SYSTEM_COMMITS.PREPUSH,
      });
    }
    const remoteObj = typeof remote === "string" ? await this.repo.getRemote(remote) : remote;
    if (!remoteObj) {
      throw new Error(`Remote ${(remote as any)?.name || remote} not found`);
    }
    if (remoteObj.authId && !remoteObj.RemoteAuth) {
      throw new Error(`Remote ${(remote as any)?.name || remote} has authId but no RemoteAuth object found`);
    }
    const { gitCorsProxy: corsProxy, RemoteAuth } = remoteObj;

    const onAuth = RemoteAuth ? GitAgentFromRemoteAuth(RemoteAuth).onAuth : undefined;

    await this.repo.push({
      ref,
      force,
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
