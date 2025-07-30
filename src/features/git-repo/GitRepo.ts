import { CommonFileSystem } from "@/Db/CommonFileSystem";
import { WatchPromiseMembers } from "@/features/git-repo/WatchPromiseMembers";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
import Emittery from "emittery";
import git, { AuthCallback } from "isomorphic-git";
import http from "isomorphic-git/http/web";

//git remote is different from IRemote as its
//more so just a Git remote as it appears in Git
//
export interface GitRemote {
  name: string;
  url: string;
}
interface IRemote {
  branch: string;
  name: string;
  url: string;
  auth?: AuthCallback;
}

export type GitRepoAuthor = {
  name: string;
  email: string;
};

type RemoteVerifyCodes = (typeof Remote.VERIFY_CODES)[keyof typeof Remote.VERIFY_CODES];
class Remote implements IRemote {
  branch: string;
  name: string;
  url: string;
  auth?: AuthCallback;

  constructor({ branch, name, url, auth }: IRemote) {
    this.branch = branch;
    this.name = name;
    this.url = url;
    this.auth = auth;
  }

  static VERIFY_CODES = {
    SUCCESS: "SUCCESS" as const,
    BRANCH_NOT_FOUND: "BRANCH_NOT_FOUND" as const,
    NO_ACCESS: "NO_ACCESS" as const,
    UNEXPECTED_ERROR: "UNEXPECTED_ERROR" as const,
  };

  async verifyRemote(): Promise<RemoteVerifyCodes> {
    try {
      const remoteRefs = await git.listServerRefs({
        http,
        url: this.url,
        onAuth: this.auth,
      });
      const branchRef = `refs/heads/${this.branch}`;
      if (remoteRefs.some((ref) => ref.ref === branchRef)) {
        return Remote.VERIFY_CODES.SUCCESS;
      } else {
        return Remote.VERIFY_CODES.BRANCH_NOT_FOUND;
      }
    } catch (e) {
      if (e instanceof git.Errors.HttpError) {
        if (e.data.statusCode === 401 || e.data.statusCode === 403) {
          return Remote.VERIFY_CODES.NO_ACCESS;
        }
        return Remote.VERIFY_CODES.UNEXPECTED_ERROR;
      }
      // NotFoundError can mean the repo doesn't exist or is private
      if (e instanceof git.Errors.NotFoundError) {
        return Remote.VERIFY_CODES.NO_ACCESS;
      }
      return Remote.VERIFY_CODES.UNEXPECTED_ERROR;
    }
  }
}

export class RepoEventsLocal extends Emittery<{
  update: void;
}> {}

export type RepoLatestCommit = {
  oid: string;
  date: number;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
};
export const RepoLatestCommitNull = {
  oid: "",
  date: 0,
  message: "",
  author: {
    name: "",
    email: "",
    timestamp: 0,
    timezoneOffset: 0,
  },
};

export const RepoDefaultInfo = {
  currentBranch: null as null | string,
  initialized: false,
  branches: [] as string[],
  remotes: [] as GitRemote[],
  latestCommit: null as RepoLatestCommit | null,
  hasChanges: false,
};
export type RepoInfoType = typeof RepoDefaultInfo;

export class Repo {
  private info: RepoInfoType | null = null;
  fs: CommonFileSystem;
  dir: AbsPath;
  defaultBranch: string;

  private readonly $p = Promise.withResolvers<RepoInfoType>();
  public readonly ready = this.$p.promise;

  private gitWpm = new WatchPromiseMembers(git);
  readonly git = this.gitWpm.watched;
  readonly events = this.gitWpm.events;

  author: GitRepoAuthor = {
    name: "Opal Editor",
    email: "user@opaleditor.com",
  };

  state: {
    initialized: boolean;
  } = {
    initialized: false,
  };

  // watchRemoteRepo(callback: () => void) {
  // this.remoteEvents = new RemoteGitChannel();
  // return this.remoteEvents.on(RemoteGitEvents.UPDATE, callback);
  // }

  async sync(forceUpdate = false) {
    await this.$p.resolve(await this.tryInfo(forceUpdate));
    return this.info!;
  }

  watchWrites(callback: () => void) {
    const unsub: (() => void)[] = [];
    unsub.push(this.events.on("checkout:end", callback));
    unsub.push(this.events.on("pull:end", callback));
    unsub.push(this.events.on("merge:end", callback));
    return () => {
      unsub.forEach((u) => u());
    };
  }
  watch(callback: () => void) {
    const unsub: (() => void)[] = [];
    // unsub.push(this.events.on("*:end", /*endless loop*/));
    // this.events.on("*:end", ()=>{
    // this.remoteEvents?.emit(RemoteGitEvents.UPDATE);
    //})
    unsub.push(this.events.on("commit:end", callback));
    unsub.push(this.events.on("checkout:end", callback));
    unsub.push(this.events.on("pull:end", callback));
    unsub.push(this.events.on("merge:end", callback));
    unsub.push(this.events.on("addRemote:end", callback));
    unsub.push(this.events.on("branch:end", callback));
    unsub.push(this.events.on("deleteBranch:end", callback));
    unsub.push(this.events.on("deleteRemote:end", callback));
    return () => {
      unsub.forEach((u) => u());
    };
  }

  static New(fs: CommonFileSystem, dir: AbsPath = absPath("/"), branch: string = "main", author?: GitRepoAuthor): Repo {
    return new Repo({ fs, dir, defaultBranch: branch, author });
  }
  constructor({
    fs,
    dir,
    defaultBranch,
    author,
  }: {
    fs: CommonFileSystem;
    dir: AbsPath;
    defaultBranch: string;
    author?: { email: string; name: string };
  }) {
    this.fs = fs;
    this.dir = dir;
    this.defaultBranch = defaultBranch;
    this.author = author || this.author;
  }

  async tryInfo(forceUpdate = true): Promise<RepoInfoType> {
    if (!forceUpdate && this.info) {
      return this.info;
    }
    return (this.info = {
      initialized: this.state.initialized,
      currentBranch: await this.tryCurrentBranch(),
      branches: await this.tryGitBranches(),
      remotes: await this.tryGitRemotes(),
      latestCommit: await this.tryLatestCommit(),
      hasChanges: await this.tryHasChanges(),
    });
  }

  tryCurrentBranch = async (): Promise<string | null> => {
    if (!(await this.exists())) return null;
    return (
      (await this.git.currentBranch({
        fs: this.fs,
        dir: this.dir,
      })) || null
    );
  };

  tryHasChanges = async (): Promise<boolean> => {
    if (!(await this.exists())) return false;
    const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
    return matrix.some(([, head, workdir, stage]) => head !== workdir || workdir !== stage);
  };

  tryGitBranches = async (): Promise<string[]> => {
    if (!(await this.exists())) return [];
    return await this.git.listBranches({
      fs: this.fs,
      dir: this.dir,
    });
  };
  tryGitRemotes = async (): Promise<GitRemote[]> => {
    if (!(await this.exists())) return [];
    const remotes = await this.git.listRemotes({
      fs: this.fs,
      dir: this.dir,
    });
    return remotes.map(({ url, remote }) => ({
      name: remote,
      url: url,
    }));
  };
  tryLatestCommit = async (): Promise<RepoLatestCommit | null> => {
    if (!(await this.exists())) return null;
    const commitOid = await this.git.resolveRef({
      fs: this.fs,
      dir: this.dir,
      ref: "HEAD",
    });
    const commit = await this.git.readCommit({
      fs: this.fs,
      dir: this.dir,
      oid: commitOid,
    });
    return {
      oid: commitOid,
      date: commit.commit.committer.timestamp * 1000, // timestamp is in seconds
      message: commit.commit.message,
      author: commit.commit.author,
    };
  };

  mustBeInitialized = async (): Promise<boolean> => {
    if (this.state.initialized) return true;
    if (!(await this.exists())) {
      await git.init({
        fs: this.fs,
        dir: this.dir,
        defaultBranch: this.defaultBranch,
      });
      await this.tryInfo(true); // Force update the info after initialization
    }
    return (this.state.initialized = true);
  };

  checkoutBranch = async (branchName: string) => {
    await this.mustBeInitialized();
    const currentBranch = await this.git.currentBranch({
      fs: this.fs,
      dir: this.dir,
    });
    if (currentBranch === branchName) return; // No change needed
    await this.git.checkout({
      fs: this.fs,
      dir: this.dir,
      ref: branchName,
      force: true, // Force checkout if necessary
      noCheckout: false, // Ensure the working directory is updated
    });
    return branchName;
  };

  addGitBranch = async ({
    branchName,
    symbolicRef,
    checkout,
  }: {
    branchName: string;
    symbolicRef?: string;
    checkout?: boolean;
  }) => {
    symbolicRef = symbolicRef || this.defaultBranch;
    checkout = checkout ?? false;
    await this.mustBeInitialized();
    const branches = await this.git.listBranches({
      fs: this.fs,
      dir: this.dir,
    });
    const uniqueBranchName = getUniqueSlug(branchName, branches);
    await this.git.branch({
      fs: this.fs,
      dir: this.dir,
      ref: uniqueBranchName,
      object: symbolicRef, // The branch to base the new branch on
      checkout,
    });
    return uniqueBranchName;
  };
  deleteGitBranch = async (branchName: string) => {
    await this.mustBeInitialized();
    const currentBranch = await this.git.currentBranch({
      fs: this.fs,
      dir: this.dir,
    });
    await this.git.deleteBranch({
      fs: this.fs,
      dir: this.dir,
      ref: branchName,
    });
    if (currentBranch === branchName) {
      await this.git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: this.defaultBranch,
        force: true,
      });
    }
  };
  replaceGitBranch = async (symbolicRef: string, branchName: string) => {
    if (symbolicRef === branchName) return;
    await this.mustBeInitialized();
    await this.addGitBranch({ branchName, symbolicRef });
    return this.deleteGitBranch(symbolicRef);
  };

  addGitRemote = async (remote: GitRemote) => {
    await this.mustBeInitialized();
    const remotes = await this.git.listRemotes({ fs: this.fs, dir: this.dir });
    await this.git.addRemote({
      fs: this.fs,
      dir: this.dir,
      remote: getUniqueSlug(
        remote.name,
        remotes.map((r) => r.remote)
      ),
      url: remote.url,
    });
  };
  replaceGitRemote = async (previous: GitRemote, remote: GitRemote) => {
    await this.mustBeInitialized();
    await this.deleteGitRemote(previous.name);
    await this.git.addRemote({
      fs: this.fs,
      dir: this.dir,
      remote: remote.name,
      url: remote.url,
      force: true,
    });
  };

  deleteGitRemote = async (remoteName: string) => {
    await this.mustBeInitialized();
    await this.git.deleteRemote({
      fs: this.fs,
      dir: this.dir,
      remote: remoteName,
    });
  };
  exists = async (): Promise<boolean> => {
    try {
      if (this.state.initialized) return true;
      await this.fs.readFile(joinPath(this.dir, ".git"));
      await git.resolveRef({ fs: this.fs, dir: this.dir, ref: "HEAD" });
      return (this.state.initialized = true);
    } catch (_e) {
      return (this.state.initialized = false);
    }
  };

  withRemote = (remote: IRemote): RepoWithRemote => {
    return new RepoWithRemote(
      {
        fs: this.fs,
        dir: this.dir,
        branch: this.defaultBranch,
        remoteBranch: remote.branch,
        remoteName: remote.name,
        url: remote.url,
        auth: remote.auth,
      },
      remote
    );
  };
  tearDown() {
    this.events.clearListeners();
  }
}
export class RepoWithRemote extends Repo {
  readonly remote: Remote;

  state: {
    initialized: boolean;
    remoteOK: boolean;
  } = {
    initialized: false,
    remoteOK: false,
  };

  constructor(
    {
      fs,
      dir,
      branch,
    }: {
      fs: CommonFileSystem;
      dir: AbsPath;
      branch: string;
      remoteBranch?: string;
      remoteName: string;
      url: string;
      auth?: AuthCallback;
    },
    remote: IRemote | Remote
  ) {
    super({ fs, dir, defaultBranch: branch });
    this.remote = remote instanceof Remote ? remote : new Remote(remote);
  }

  get isRemoteOk() {
    return this.state.remoteOK;
  }
  async _ready() {
    if (this.state.remoteOK && this.state.initialized) return true;
    return (
      (this.state.remoteOK = await this.assertRemoteOK()) && (this.state.initialized = await this.mustBeInitialized())
    );
  }

  async assertRemoteOK({ verifyOrThrow }: { verifyOrThrow: boolean } = { verifyOrThrow: false }) {
    if (this.state.remoteOK) return true;
    const verifyCode = await this.remote.verifyRemote();
    if (verifyCode !== Remote.VERIFY_CODES.SUCCESS) {
      if (verifyOrThrow) throw new Error(`Remote verification failed with code: ${verifyCode}`);
      return (this.state.remoteOK = false);
    }
    return (this.state.remoteOK = true);
  }
}
export class GitPlaybook {
  constructor(private repo: Repo) {}

  async commit(message: string, author?: GitRepoAuthor) {
    await this.repo.mustBeInitialized();
    await this.repo.git.add({
      fs: this.repo.fs,
      dir: this.repo.dir,
      filepath: ".",
    });
    await this.repo.git.commit({
      fs: this.repo.fs,
      dir: this.repo.dir,
      message,
      author: author || this.repo.author,
    });
  }

  async addRemote(remote: IRemote) {
    await this.repo.git.addRemote({
      fs: this.repo.fs,
      dir: this.repo.dir,
      remote: remote.name,
      url: remote.url,
      force: true,
    });
    return this.repo.withRemote(remote);
  }
}

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

    await this.commit("opal commit", this.remoteRepo.author);
    await git.push({
      fs: this.remoteRepo.fs,
      http,
      dir: this.remoteRepo.dir,
      remote: this.remoteRepo.remote.name,
      ref: this.remoteRepo.defaultBranch, // or any branch you want to push to
      onAuth: this.remoteRepo.remote.auth,
    });
  }
  async pull() {
    await this.precommandCheck();
    /*fetch,merge*/
    await git.fetch({
      fs: this.remoteRepo.fs,
      http,
      dir: this.remoteRepo.dir,
      remote: this.remoteRepo.remote.name,
      ref: this.remoteRepo.remote.branch, // or any branch you want to fetch from
      onAuth: this.remoteRepo.remote.auth,
    });
    await git.merge({
      fs: this.remoteRepo.fs,
      dir: this.remoteRepo.dir,
      ours: this.remoteRepo.defaultBranch, // or any branch you want to merge into
      theirs: this.remoteRepo.remote.branch, // or any branch you want to merge from
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
