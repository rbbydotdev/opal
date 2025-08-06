import { CommonFileSystem } from "@/Db/CommonFileSystem";
import { Disk } from "@/Db/Disk";
import { WatchPromiseMembers } from "@/features/git-repo/WatchPromiseMembers";
import { Channel } from "@/lib/channel";
import { deepEqual } from "@/lib/deepEqual";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
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

type GitHistoryType = Array<{
  oid: string;
  commit: { message: string; author: { name: string; email: string; timestamp: number; timezoneOffset: number } };
}>;
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
  defaultMainBranch: string;

  mutex = new Mutex();
  private unsubs: (() => void)[] = [];

  local = new RepoEventsLocal();
  remote: RepoEventsRemote;

  onTearDown = (fn: () => void) => {
    this.unsubs.push(fn);
    return this;
  };

  get gitDir() {
    return joinPath(this.dir, ".git");
  }

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

  resetToHead = async () => {
    return this.checkoutRef("HEAD");
  };
  getPrevBranch = async () => {
    const prevBranch = await this.fs.readFile(joinPath(this.gitDir, "PREV_BRANCH")).catch(() => null);
    if (prevBranch) {
      return String(prevBranch).trim();
    }
    return null;
  };
  writePrevBranch = async (branchName: string) => {
    await this.fs.writeFile(joinPath(this.gitDir, "PREV_BRANCH"), branchName);
  };

  initListeners() {
    this.remote.init();
    this.remote.on(RepoEvents.INFO, () => {
      void this.syncLocal();
    });
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
  getInfo = () => {
    return this.info;
  };

  gitListener(cb: () => void) {
    return this.local.on(RepoEvents.GIT, cb);
  }

  infoListener(cb: (info: RepoInfoType) => void) {
    return this.local.on(RepoEvents.INFO, cb);
  }
  private syncLocal = async () => {
    return this.sync({ emitRemote: false });
  };

  rememberCurrentBranch = async () => {
    const currentBranch = await this.currentBranch({ fullname: true });
    if (currentBranch) {
      await this.fs.writeFile(joinPath(this.gitDir, "PREV_BRANCH"), currentBranch);
      return true;
    } else {
      return false;
    }
  };

  async sync({ emitRemote = true } = {}) {
    const newInfo = { ...(await this.tryInfo()) };
    await this.$p.resolve(newInfo);
    if (deepEqual(this.info, newInfo)) {
      return this.info; // No changes, return current info
    }
    void this.local.emit(RepoEvents.INFO, newInfo);
    if (emitRemote) {
      void this.remote.emit(RepoEvents.INFO, newInfo);
    }
    return (this.info = newInfo);
  }
  // findParentBranchHead = async (ref: string): Promise<string | null> => {
  //check the reflog to find the parent

  // }

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
    mutex = new Mutex(),
  }: {
    guid: string;
    fs: CommonFileSystem;
    dir: AbsPath;
    defaultBranch: string;
    author?: { email: string; name: string };
    mutex?: Mutex;
  }) {
    this.mutex = mutex;
    this.guid = guid;
    this.fs = fs;
    this.dir = dir;
    this.defaultMainBranch = defaultBranch;
    this.author = author || this.author;
    this.remote = new RepoEventsRemote(this.guid);
  }

  addRemote = async (name: string, url: string) => {
    await this.git.addRemote({
      fs: this.fs,
      dir: this.dir,
      remote: name,
      url: url,
      force: true,
    });
  };

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
    try {
      const matrix = await this.mutex.runExclusive(() => git.statusMatrix({ fs: this.fs, dir: this.dir }));
      return matrix.some(([, head, workdir, stage]) => head !== workdir || workdir !== stage);
    } catch (error) {
      console.error("Error checking for changes:", error);
      return true;
    }
  };

  getBranches = async (): Promise<string[]> => {
    if (!(await this.exists())) return [];
    return await this.git.listBranches({
      fs: this.fs,
      dir: this.dir,
    });
  };
  isBranchOrTag = async (ref: string) => {
    const branches = await this.getBranches();
    const tags = await git.listTags({ fs: this.fs, dir: this.dir });
    return branches.includes(ref) || tags.includes(ref);
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

  getCommitHistory = async (options?: { depth?: number; ref?: string; filepath?: string }): Promise<GitHistoryType> => {
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

  resolveRef = async (ref: string): Promise<string> => {
    await this.mustBeInitialized();
    return this.git.resolveRef({
      fs: this.fs,
      dir: this.dir,
      ref,
    });
  };

  mustBeInitialized = async (): Promise<boolean> => {
    if (this.state.initialized) return true;
    if (!(await this.exists())) {
      await git.init({
        fs: this.fs,
        dir: this.dir,
        defaultBranch: this.defaultMainBranch,
      });
      await this.sync();
    }
    return (this.state.initialized = true);
  };

  async add(filepath: string | string[]) {
    await this.mustBeInitialized();
    return this.git.add({
      fs: this.fs,
      dir: this.dir,
      filepath: Array.isArray(filepath) ? filepath : [filepath],
    });
  }
  async remove(filepath: string | string[]) {
    await this.mustBeInitialized();
    return this.mutex.runExclusive(() =>
      Promise.all(
        (Array.isArray(filepath) ? filepath : [filepath]).map((fp) =>
          this.git.remove({
            fs: this.fs,
            dir: this.dir,
            filepath: fp,
          })
        )
      )
    );
  }

  checkoutRef = async (ref: string) => {
    //check if ref is ref or branch name
    await this.mustBeInitialized();
    const currentBranch = await this.getCurrentBranch();
    if (currentBranch === ref) return; // No change needed
    //TODO consider doing more mutex locks elsewhere
    await this.mutex.runExclusive(async () => {
      await this.git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: ref,
        force: true, // Force checkout if necessary
        // noCheckout: false, // Ensure the working directory is updated
      });
      if (await this.isBranchOrTag(ref)) {
        await this.rememberCurrentBranch();
      }
    });
    return ref;
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
    symbolicRef = symbolicRef || this.defaultMainBranch;
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

    return this.mutex.runExclusive(async () => {
      await this.git.deleteBranch({
        fs: this.fs,
        dir: this.dir,
        ref: branchName,
      });
      if (currentBranch === branchName) {
        await this.git.checkout({
          fs: this.fs,
          dir: this.dir,
          ref: this.defaultMainBranch,
          force: true,
        });
      }
    });
  };

  async statusMatrix() {
    await this.mustBeInitialized();
    return git.statusMatrix({ fs: this.fs, dir: this.dir });
  }
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

  currentBranch = async ({ fullname = false }: { fullname: boolean }): Promise<string | void> => {
    await this.mustBeInitialized();
    return await this.git.currentBranch({
      fs: this.fs,
      dir: this.dir,
      fullname,
    });
  };

  writeRef = async ({ ref, value, force = false }: { ref: string; value: string; force: boolean }) => {
    await this.mustBeInitialized();
    return this.git.writeRef({
      fs: this.fs,
      dir: this.dir,
      ref,
      value,
      force,
    });
  };

  withRemote = (remote: IRemote): RepoWithRemote => {
    return new RepoWithRemote(
      {
        guid: this.guid,
        fs: this.fs,
        dir: this.dir,
        branch: this.defaultMainBranch,
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
  RENAME_BRANCH: "opal@RENAME_BRANCH",
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
  //should probably dep inject shared mutex from somewhere rather than relying on repo's
  //rather should share mutex
  constructor(private repo: Repo, private mutex = new Mutex()) {}

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

  // static readonly ORIG_BRANCH_REF = "refs/orig-branch";

  // getOrigBranchName = async (): Promise<string | null> => {
  //   const origBranch = await this.repo.resolveRef(GitPlaybook.ORIG_BRANCH_REF);
  //   if (origBranch) {
  //     return origBranch;
  //   } else {
  //     return null;
  //   }
  // };
  // recallOrigBranch = async () => {
  //   const origBranch = await this.repo.resolveRef(GitPlaybook.ORIG_BRANCH_REF);
  //   if (origBranch) {
  //     console.log("Recalling original branch:", origBranch);
  //     await this.repo.checkoutRef(origBranch);
  //     return true;
  //   } else {
  //     return false;
  //   }
  // };
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
  async addAllCommit({
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
    const statusMatrix = await this.repo.statusMatrix();

    for (const [filepath, head, workdir] of statusMatrix) {
      if (head && !workdir) {
        await this.repo.remove(filepath);
      }
    }
    await this.repo.add(filepath);
    await this.repo.git.commit({
      fs: this.repo.fs,
      dir: this.repo.dir,
      message,
      author: author || this.repo.author,
    });
    return true;
  }

  resetToPrevBranch = async () => {
    const prevBranch = await this.repo.getPrevBranch();
    if (prevBranch) {
      await this.repo.checkoutRef(prevBranch);
      return true;
    }
    return false;
  };

  // async addRemote(remote: IRemote) {
  //   await this.repo.git.addRemote({
  //     fs: this.repo.fs,
  //     dir: this.repo.dir,
  //     remote: remote.name,
  //     url: remote.url,
  //     force: true,
  //   });
  //   return this.repo.withRemote(remote);
  // }
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
      await this.addAllCommit({ message: SYSTEM_COMMITS.PREPUSH, author: this.remoteRepo.author });
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
