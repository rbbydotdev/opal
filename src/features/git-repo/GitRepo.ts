import { CommonFileSystem } from "@/Db/CommonFileSystem";
import { Disk } from "@/Db/Disk";
import { WatchPromiseMembers } from "@/features/git-repo/WatchPromiseMembers";
import { Channel } from "@/lib/channel";
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
  commitHistory: [] as Array<{
    oid: string;
    commit: { message: string; author: { name: string; email: string; timestamp: number; timezoneOffset: number } };
  }>,
};
export type RepoInfoType = typeof RepoDefaultInfo;
//--------------------------

export const SIGNAL_ONLY = undefined;
export const RepoEvents = {
  WORKTREE: "worktree" as const,
  GIT: "git" as const,
  INFO: "info" as const,
};

type RepoLocalEventPayload = {
  [RepoEvents.WORKTREE]: undefined;
  [RepoEvents.GIT]: undefined;
  [RepoEvents.INFO]: RepoInfoType;
};
export class RepoEventsLocal extends Emittery<RepoLocalEventPayload> {}

export type RepoRemoteEventPayload = {
  [RepoEvents.WORKTREE]: undefined;
  [RepoEvents.GIT]: undefined;
  [RepoEvents.INFO]: RepoInfoType;
};
export class RepoEventsRemote extends Channel<RepoRemoteEventPayload> {}

export class Repo {
  readonly guid: string;
  private info: RepoInfoType | null = null;
  fs: CommonFileSystem;
  dir: AbsPath;
  defaultBranch: string;

  private unsubs: (() => void)[] = [];

  local = new RepoEventsLocal();
  remote: RepoEventsRemote;

  private readonly $p = Promise.withResolvers<RepoInfoType>();
  public readonly ready = this.$p.promise;

  private gitWpm = new WatchPromiseMembers(git);
  readonly git = this.gitWpm.watched;
  private readonly gitEvents = this.gitWpm.events;

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

  initListeners() {
    return this.gitEvents.on(
      [
        "commit:end",
        "checkout:end",
        "pull:end",
        "merge:end",
        "addRemote:end",
        "branch:end",
        "deleteBranch:end",
        "deleteRemote:end",
      ],
      () => {
        void this.local.emit(RepoEvents.GIT, SIGNAL_ONLY);
        void this.remote.emit(RepoEvents.GIT, SIGNAL_ONLY);
        void this.sync();
      }
    );
  }

  gitListener(cb: () => void) {
    return this.local.on(RepoEvents.GIT, cb);
  }

  infoListener(cb: (info: RepoInfoType) => void) {
    return this.local.on(RepoEvents.INFO, cb);
  }
  async sync() {
    // const currentInfo = { ...this.info };
    const newInfo = { ...(await this.tryInfo()) };
    await this.$p.resolve(newInfo);
    // if (deepEqual(currentInfo, newInfo)) {
    //   return this.info; // No changes, return current info
    // }
    void this.local.emit(RepoEvents.INFO, newInfo);
    void this.remote.emit(RepoEvents.INFO, newInfo);
    return (this.info = newInfo);
  }

  watch(callback: () => void) {
    const unsub: (() => void)[] = [];
    unsub.push(
      this.gitEvents.on(
        [
          "commit:end",
          "checkout:end",
          "pull:end",
          "merge:end",
          "addRemote:end",
          "branch:end",
          "deleteBranch:end",
          "deleteRemote:end",
        ],
        callback
      )
    );
    return () => {
      unsub.forEach((u) => u());
    };
  }

  init() {
    this.unsubs.push(this.initListeners());
    void this.sync();
  }

  static New(
    fs: CommonFileSystem,
    guid: string,
    dir: AbsPath = absPath("/"),
    branch: string = "main",
    author?: GitRepoAuthor
  ): Repo {
    return new Repo({ fs, guid, dir, defaultBranch: branch, author });
  }

  static FromDisk(
    disk: Disk,
    guid: string,
    dir: AbsPath = absPath("/"),
    branch: string = "main",
    author?: GitRepoAuthor
  ): Repo {
    return new Repo({ guid, fs: disk.fs, dir, defaultBranch: branch, author });
  }
  constructor({
    guid,
    fs,
    dir,
    defaultBranch,
    author,
  }: {
    guid: string;
    fs: CommonFileSystem;
    dir: AbsPath;
    defaultBranch: string;
    author?: { email: string; name: string };
  }) {
    this.guid = guid;
    this.fs = fs;
    this.dir = dir;
    this.defaultBranch = defaultBranch;
    this.author = author || this.author;
    this.remote = new RepoEventsRemote(this.guid);
  }

  async tryInfo(): Promise<RepoInfoType> {
    return {
      initialized: this.state.initialized,
      currentBranch: await this.getCurrentBranch(),
      branches: await this.getBranches(),
      remotes: await this.getRemotes(),
      latestCommit: await this.getLatestCommit(),
      hasChanges: await this.hasChanges(),
      commitHistory: await this.getCommitHistory({ depth: 20 }),
    };
  }

  getCurrentBranch = async (): Promise<string | null> => {
    if (!(await this.exists())) return null;
    return (
      (await this.git.currentBranch({
        fs: this.fs,
        dir: this.dir,
      })) || null
    );
  };

  hasChanges = async (): Promise<boolean> => {
    if (!(await this.exists())) return false;
    const matrix = await git.statusMatrix({ fs: this.fs, dir: this.dir });
    return matrix.some(([, head, workdir, stage]) => head !== workdir || workdir !== stage);
  };

  getBranches = async (): Promise<string[]> => {
    if (!(await this.exists())) return [];
    return await this.git.listBranches({
      fs: this.fs,
      dir: this.dir,
    });
  };
  getRemotes = async (): Promise<GitRemote[]> => {
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
  getLatestCommit = async (): Promise<RepoLatestCommit | null> => {
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

  getCommitHistory = async (options?: {
    depth?: number;
    ref?: string;
    filepath?: string;
  }): Promise<
    Array<{
      oid: string;
      commit: { message: string; author: { name: string; email: string; timestamp: number; timezoneOffset: number } };
    }>
  > => {
    if (!(await this.exists())) return [];

    try {
      const commits = await this.git.log({
        fs: this.fs,
        dir: this.dir,
        depth: options?.depth || 20, // Default to 20 commits
        ref: options?.ref || "HEAD",
        filepath: options?.filepath, // Optional: get history for specific file
      });

      return commits;
    } catch (error) {
      console.error("Error fetching commit history:", error);
      return [];
    }
  };

  mustBeInitialized = async (): Promise<boolean> => {
    if (this.state.initialized) return true;
    if (!(await this.exists())) {
      await git.init({
        fs: this.fs,
        dir: this.dir,
        defaultBranch: this.defaultBranch,
      });
      await this.sync();
    }
    return (this.state.initialized = true);
  };

  checkoutBranch = async (branchName: string) => {
    await this.mustBeInitialized();
    const currentBranch = await this.getCurrentBranch();
    if (currentBranch === branchName) return; // No change needed
    await this.git.checkout({
      fs: this.fs,
      dir: this.dir,
      ref: branchName,
      force: true, // Force checkout if necessary
      // noCheckout: false, // Ensure the working directory is updated
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
    const currentBranch = await this.getCurrentBranch();
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
        guid: this.guid,
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
    this.unsubs.forEach((unsub) => unsub());
    this.gitEvents.clearListeners();
  }
}
const SYSTEM_COMMITS = {
  COMMIT: "opal@COMMIT",
  SWITCH_BRANCH: "opal@SWITCH_BRANCH",
  SWITCH_COMMIT: "opal@SWITCH_COMMIT",
  INIT: "opal@INIT",
  PREPUSH: "opal@PREPUSH",
};
export class RepoWithRemote extends Repo {
  readonly gitRemote: Remote;

  state: {
    initialized: boolean;
    remoteOK: boolean;
  } = {
    initialized: false,
    remoteOK: false,
  };

  constructor(
    {
      guid,
      fs,
      dir,
      branch,
    }: {
      guid: string;
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
    super({ guid, fs, dir, defaultBranch: branch });
    this.gitRemote = remote instanceof Remote ? remote : new Remote(remote);
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
    const verifyCode = await this.gitRemote.verifyRemote();
    if (verifyCode !== Remote.VERIFY_CODES.SUCCESS) {
      if (verifyOrThrow) throw new Error(`Remote verification failed with code: ${verifyCode}`);
      return (this.state.remoteOK = false);
    }
    return (this.state.remoteOK = true);
  }
}
export class GitPlaybook {
  constructor(private repo: Repo) {}

  switchBranch = async (branchName: string) => {
    if ((await this.repo.getCurrentBranch()) === branchName) return false;
    if (await this.repo.hasChanges()) {
      await this.addCommit({
        message: SYSTEM_COMMITS.SWITCH_BRANCH,
      });
    }
    await this.repo.checkoutBranch(branchName);
    return true;
  };

  //a new branch is created from the current branch and commit
  //
  // switchToCommitBranch =
  switchCommit = async (commitOid: string) => {
    if (await this.repo.hasChanges()) {
      await this.addCommit({
        message: SYSTEM_COMMITS.SWITCH_COMMIT,
      });
    }
    await this.repo.git.checkout({
      fs: this.repo.fs,
      dir: this.repo.dir,
      ref: commitOid,
      force: true,
    });
    return true;
  };
  async addCommit({
    message,
    author,
    allowEmpty = false,
    filepath = ".",
  }: {
    message: string;
    filepath?: string;
    author?: GitRepoAuthor;
    allowEmpty?: boolean;
  }) {
    await this.repo.mustBeInitialized();
    if (!allowEmpty && !(await this.repo.hasChanges())) {
      return false;
    }
    await this.repo.git.add({
      fs: this.repo.fs,
      dir: this.repo.dir,
      filepath,
    });
    await this.repo.git.commit({
      fs: this.repo.fs,
      dir: this.repo.dir,
      message,
      author: author || this.repo.author,
    });
    return true;
  }

  resetToHead = async () => {};

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

    if (await this.remoteRepo.hasChanges()) {
      await this.addCommit({ message: SYSTEM_COMMITS.PREPUSH, author: this.remoteRepo.author });
    }
    await git.push({
      fs: this.remoteRepo.fs,
      http,
      dir: this.remoteRepo.dir,
      remote: this.remoteRepo.gitRemote.name,
      ref: this.remoteRepo.defaultBranch, // or any branch you want to push to
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
      ours: this.remoteRepo.defaultBranch, // or any branch you want to merge into
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
