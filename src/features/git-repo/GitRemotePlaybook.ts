import { GitPlaybook, SYSTEM_COMMITS } from "@/features/git-repo/GitPlaybook";
import { RepoWithRemote } from "@/features/git-repo/RepoWithRemote";
import git from "isomorphic-git";

import http from "isomorphic-git/http/web";

export class GitRemotePlaybook extends GitPlaybook {
  constructor(private remoteRepo: RepoWithRemote) {
    super(remoteRepo);
  }

  private async precommandCheck() {
    if (!this.remoteRepo.isRemoteOk) {
      await this.remoteRepo.assertRemoteOK({ verifyOrThrow: true });
    }
    if (!(await this.remoteRepo._ready())) {
    }
  }
  async push() {
    await this.precommandCheck();
    /*commit,push*/
    if (await this.remoteRepo.hasChanges()) {
      await this.addAllCommit({ message: SYSTEM_COMMITS.PREPUSH });
    }
    await git.push({
      fs: this.remoteRepo.fs,
      http,
      dir: this.remoteRepo.dir,
      remote: this.remoteRepo.gitRemote.name,
      ref: this.remoteRepo.defaultMainBranch, // or any branch you want to push to
      onAuth: this.remoteRepo.gitRemote.auth,
    });
  }
  async pull() {
    await this.precommandCheck();
    /*fetch,merge*/
    await git.fetch({
      fs: this.remoteRepo.fs,
      http,
      dir: this.remoteRepo.dir,
      remote: this.remoteRepo.gitRemote.name,
      ref: this.remoteRepo.gitRemote.branch, // or any branch you want to fetch from
      onAuth: this.remoteRepo.gitRemote.auth,
    });
    await git.merge({
      fs: this.remoteRepo.fs,
      dir: this.remoteRepo.dir,
      ours: this.remoteRepo.defaultMainBranch, // or any branch you want to merge into
      theirs: this.remoteRepo.gitRemote.branch, // or any branch you want to merge from
      fastForwardOnly: true, // Set to false if you want to allow non-fast-forward merges
    });
  }
  async syncWithRemote() {
    await this.precommandCheck();
    await this.remoteRepo._ready();
    /*commit,fetch,merge,push*/
    //check if the repo is initialized
    // await
    // await this.initRepo()
    //   .then(() => this.pull())
    //   .then(() => this.push())
    //   .catch((error) => {
    //     console.error("Error syncing with remote:", error);
    //   });
  }
}
