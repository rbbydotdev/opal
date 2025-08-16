import { Disk, DiskJType } from "@/Db/Disk";
import { ClientDb } from "@/Db/instance";
import { isApiAuth } from "@/Db/RemoteAuth";
// import { RepoWithRemote } from "@/features/git-repo/RepoWithRemote";
import { WatchPromiseMembers } from "@/features/git-repo/WatchPromiseMembers";
import { Channel } from "@/lib/channel";
import { deepEqual } from "@/lib/deepEqual";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { isWebWorker } from "@/lib/isServiceWorker";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import Emittery from "emittery";
import git, { AuthCallback, MergeResult } from "isomorphic-git";
import { isOAuthAuth } from "../../Db/RemoteAuth";
//git remote is different from IRemote as its
//more so just a Git remote as it appears in Git
//
export interface GitRemote {
  name: string;
  url: string;
  gitCorsProxy?: string;
  authId?: string;
}
export interface IRemote {
  branch: string;
  name: string;
  url: string;
  auth?: AuthCallback;
}

export type GitRepoAuthor = {
  name: string;
  email: string;
};

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
  latestCommit: {
    oid: "",
    date: 0,
    message: "",
    author: { name: "", email: "", timestamp: 0, timezoneOffset: 0 },
  },
  hasChanges: false,
  commitHistory: [] as Array<{
    oid: string;
    commit: { message: string; author: { name: string; email: string; timestamp: number; timezoneOffset: number } };
  }>,
  context: "" as "main" | "worker" | "",
  exists: false,
  isMerging: false,
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

export function isMergeConflictError(result: unknown): result is InstanceType<typeof git.Errors.MergeConflictError> {
  return result instanceof git.Errors.MergeConflictError;
}
// type MergeResult = {
//     oid?: string;
//     alreadyMerged?: boolean;
//     fastForward?: boolean;
//     mergeCommit?: boolean;
//     tree?: string;
// }
export type MergeConflict = InstanceType<typeof git.Errors.MergeConflictError>["data"];
export function isMergeConflict(data: unknown): data is MergeConflict {
  return (
    typeof data === "object" &&
    data !== null &&
    "filepaths" in data &&
    Array.isArray((data as any).filepaths) &&
    "bothModified" in data &&
    Array.isArray((data as any).bothModified) &&
    "deleteByUs" in data &&
    Array.isArray((data as any).deleteByUs) &&
    "deleteByTheirs" in data &&
    Array.isArray((data as any).deleteByTheirs)
  );
}

export type RepoJType = {
  guid: string;
  disk: Disk;
  dir: AbsPath;
  defaultBranch: string;
};
export class GitRepo {
  disk: Disk;
  dir: AbsPath = absPath("/");
  defaultMainBranch: string = "main";
  readonly guid: string;
  mutex = new Mutex();

  local = new RepoEventsLocal();
  remote: RepoEventsRemote;
  private readonly $p = Promise.withResolvers<RepoInfoType>();
  public readonly ready = this.$p.promise;
  private unsubs: (() => void)[] = [];
  private info: RepoInfoType | null = null;

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

  onTearDown = (fn: () => void) => {
    this.unsubs.push(fn);
    return this;
  };

  get fs() {
    return this.disk.fs;
  }

  get gitDir() {
    return joinPath(this.dir, ".git");
  }

  getPrevBranch = async () => {
    const prevBranch = await this.fs.readFile(joinPath(this.gitDir, "PREV_BRANCH")).catch(() => null);
    if (prevBranch) {
      return String(prevBranch).trim();
    }
    return null;
  };

  private syncLocal = async () => {
    return this.sync({ emitRemote: false });
  };

  getInfo = () => {
    return this.info;
  };
  initListeners = () => {
    this.remote.init();
    this.remote.on(RepoEvents.INFO, () => {
      if (isWebWorker()) {
        void this.sync();
      } else {
        void this.syncLocal();
      }
    });
    //TODO: added this donno if breaks in main or worker?
    void this.remote.on(RepoEvents.GIT, () => {
      void this.local.emit(RepoEvents.GIT, SIGNAL_ONLY);
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
  };

  gitListener = (cb: () => void) => {
    return this.local.on(RepoEvents.GIT, cb);
  };

  infoListener = (cb: (info: RepoInfoType) => void) => {
    return this.local.on(RepoEvents.INFO, cb);
  };
  writePrevBranch = async (branchName: string) => {
    await this.fs.writeFile(joinPath(this.gitDir, "PREV_BRANCH"), branchName);
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

  sync = async ({ emitRemote = true } = {}) => {
    const newInfo = { ...(await this.tryInfo()) };
    await this.$p.resolve(newInfo);
    if (deepEqual(this.info, newInfo)) {
      return this.info; // No changes, return current info
    }
    this.info = newInfo;
    void this.local.emit(RepoEvents.INFO, newInfo);
    if (emitRemote) {
      void this.remote.emit(RepoEvents.INFO, newInfo);
    }

    return newInfo;
  };

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
    return this.sync({ emitRemote: false });
  }

  static New(
    disk: Disk,
    guid: string,
    dir: AbsPath = absPath("/"),
    branch: string = "main",
    author?: GitRepoAuthor
  ): GitRepo {
    return new GitRepo({ disk, guid, dir, defaultBranch: branch, author });
  }

  static FromDisk(
    disk: Disk,
    guid: string,
    dir: AbsPath = absPath("/"),
    branch: string = "main",
    author?: GitRepoAuthor
  ): GitRepo {
    return new GitRepo({ guid, disk, dir, defaultBranch: branch, author });
  }
  constructor({
    guid,
    disk,
    dir,
    defaultBranch,
    author,
    mutex,
  }: {
    guid: string;
    disk: Disk | DiskJType;
    dir?: AbsPath;
    defaultBranch?: string;
    author?: { email: string; name: string };
    mutex?: Mutex;
  }) {
    this.mutex = mutex || this.mutex;
    this.guid = guid;
    this.disk = disk instanceof Disk ? disk : Disk.FromJSON(disk);
    this.dir = dir || this.dir;
    this.defaultMainBranch = defaultBranch || this.defaultMainBranch;
    this.author = author || this.author;
    this.remote = new RepoEventsRemote(this.guid);
  }

  toJSON = () => {
    return {
      guid: this.guid,
      disk: this.disk.toJSON(),
      dir: this.dir,
      defaultBranch: this.defaultMainBranch,
    };
  };

  static FromJSON = (json: { guid: string; disk: Disk; dir: AbsPath; defaultBranch: string }): GitRepo => {
    return new GitRepo({
      guid: json.guid,
      disk: Disk.FromJSON(json.disk),
      dir: json.dir,
      defaultBranch: json.defaultBranch,
    });
  };

  isMerging = async (): Promise<boolean> => {
    const mergeHead = await this.getMergeState();
    return mergeHead !== null;
  };
  setMergeMessage = async (message: string) => {
    // if (!(await this.exists())) return;
    if (!message) {
      await this.fs.unlink(joinPath(this.gitDir, "MERGE_MSG")).catch(() => {
        // Ignore if file does not exist
      });
      return;
    }
    await this.fs.writeFile(joinPath(this.gitDir, "MERGE_MSG"), message);
  };
  setMergeState = async (mergeHead: string | null) => {
    // if (!(await this.exists())) return;
    if (mergeHead) {
      await this.fs.writeFile(joinPath(this.gitDir, "MERGE_HEAD"), mergeHead);
    } else {
      await this.fs.unlink(joinPath(this.gitDir, "MERGE_HEAD")).catch(() => {
        // Ignore if file does not exist
      });
    }
  };
  getMergeState = async () => {
    if (!(await this.exists())) return null;
    const mergeHead = await this.fs.readFile(joinPath(this.gitDir, "MERGE_HEAD")).catch(() => null);
    if (mergeHead) {
      return String(mergeHead).trim();
    }
    return null;
  };
  tryInfo = async (): Promise<RepoInfoType> => {
    if (!(await this.exists())) {
      return RepoDefaultInfo;
    }
    return {
      initialized: this.state.initialized,
      currentBranch: await this.getCurrentBranch(),
      branches: await this.getBranches(),
      remotes: await this.getRemotes(),
      latestCommit: await this.getLatestCommit(),
      hasChanges: await this.hasChanges(),
      commitHistory: await this.getCommitHistory({ depth: 20 }),
      context: isWebWorker() ? "worker" : "main",
      exists: await this.exists(),
      isMerging: await this.isMerging(),
    };
  };

  getCurrentBranch = async (): Promise<string | null> => {
    // if (!(await this.exists())) return null;
    return (
      (await this.git.currentBranch({
        fs: this.fs,
        dir: this.dir,
      })) || null
    );
  };

  hasChanges = async (): Promise<boolean> => {
    // if (!(await this.exists())) return false;
    try {
      const matrix = await this.mutex.runExclusive(() => git.statusMatrix({ fs: this.fs, dir: this.dir }));
      return matrix.some(([, head, workdir, stage]) => head !== workdir || workdir !== stage);
    } catch (error) {
      console.error("Error checking for changes:", error);
      return true;
    }
  };

  async setAuthor({ name, email }: { name: string; email: string }) {
    // await this.mustBeInitialized();
    this.author = { name, email };
    await this.setConfig("user.name", name);
    await this.setConfig("user.email", email);
  }

  getBranches = async (): Promise<string[]> => {
    // if (!(await this.exists())) return [];
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
    return Promise.all(
      remotes.map(async (remote) => {
        const gitCorsProxy = await this.getGitCorsProxy(remote.remote);
        const authId = await this.getAuthId(remote.remote);
        return {
          name: remote.remote,
          url: remote.url,
          gitCorsProxy: gitCorsProxy || undefined,
          authId: authId || undefined,
        };
      })
    );
  };

  getLatestCommit = async (): Promise<RepoLatestCommit> => {
    if (!(await this.exists())) return RepoLatestCommitNull;
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

  mergeCommit = async ({
    from,
    into,
    author = this.author,
  }: {
    from: string;
    into: string;
    author?: GitRepoAuthor;
  }): Promise<string> => {
    const head = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: "HEAD" });
    const mergeHead = (await this.fs.readFile(joinPath(this.dir, ".git", "MERGE_HEAD"))).toString().trim();
    await this.setMergeState(null);
    return git.commit({
      fs: this.fs,
      dir: this.dir,
      author,
      message: "Merge branch " + into + " into " + from,
      parent: [head, mergeHead],
    });
  };

  merge = async (from: string, into: string): Promise<MergeResult | MergeConflict> => {
    await this.mustBeInitialized();
    return this.git
      .merge({
        fs: this.fs,
        dir: this.dir,
        author: this.author,
        ours: from,
        theirs: into,
        abortOnConflict: false,
      })
      .catch(async (e) => {
        if (isMergeConflictError(e)) {
          console.log("Merge conflict detected:", { from, into }, e.data);
          // await this.fs.writeFile("/.git/MERGE_HEAD", await git.resolveRef({ fs: this.fs, dir: this.dir, ref: into }));
          await this.setMergeState(await git.resolveRef({ fs: this.fs, dir: this.dir, ref: into }));
          console.log(
            await Promise.all(
              e.data.filepaths.map((fp) => this.fs.readFile(joinPath(absPath("/"), fp)).then((c) => c.toString()))
            )
          );

          return structuredClone(e.data);
        } else {
          throw e;
        }
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

  commit = async ({ message, author }: { message: string; author?: GitRepoAuthor }): Promise<string> => {
    // await this.mustBeInitialized();
    if (await this.isMerging()) {
      await this.setMergeState(null);
    }
    return this.git.commit({
      fs: this.fs,
      dir: this.dir,
      author: author || this.author,
      message,
    });
  };

  add = async (filepath: string | string[]): Promise<void> => {
    // await this.mustBeInitialized();
    return this.git.add({
      fs: this.fs,
      dir: this.dir,
      filepath: Array.isArray(filepath) ? filepath : [filepath],
    });
  };

  remove = async (filepath: string | string[]): Promise<void> => {
    // await this.mustBeInitialized();
    await this.mutex.runExclusive(() =>
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
  };

  checkoutDefaultBranch = async () => {
    return await this.checkoutRef(this.defaultMainBranch);
  };

  checkoutRef = async (ref: string): Promise<string | void> => {
    //check if ref is ref or branch name
    // await this.mustBeInitialized();
    if (await this.isMerging()) {
      throw new Error("Cannot checkout while merging. Please resolve conflicts first.");
    }
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
  }): Promise<string | void> => {
    // await this.mustBeInitialized();
    symbolicRef = symbolicRef || this.defaultMainBranch;
    checkout = checkout ?? false;

    const branches = await this.git.listBranches({
      fs: this.fs,
      dir: this.dir,
    });
    const uniqueBranchName = getUniqueSlug(branchName, branches);
    console.log("Creating new branch:", uniqueBranchName, "from", symbolicRef);
    const isMerging = await this.isMerging();
    if (isMerging) {
      console.warn("Creating branch while merging, will not checkout.");
    }
    await this.git.branch({
      fs: this.fs,
      dir: this.dir,
      ref: uniqueBranchName,
      object: symbolicRef, // The branch to base the new branch on
      checkout: isMerging ? false : checkout, // Don't checkout if merging
    });
    return uniqueBranchName;
  };

  deleteGitBranch = async (branchName: string): Promise<void> => {
    // await this.mustBeInitialized();
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

  statusMatrix = async (): Promise<Array<[string, number, number, number]>> => {
    // await this.mustBeInitialized();
    return git.statusMatrix({ fs: this.fs, dir: this.dir });
  };

  setConfig = async (path: string, value: string): Promise<void> => {
    // await this.mustBeInitialized();
    await this.git.setConfig({
      fs: this.fs,
      dir: this.dir,
      path,
      value,
    });
  };
  getConfig = async (path: string): Promise<string | null> => {
    // await this.mustBeInitialized();
    return this.git.getConfig({
      fs: this.fs,
      dir: this.dir,
      path,
    });
  };

  setGitCorsProxy = async (remoteName: string, gitCorsProxy: string): Promise<void> => {
    return this.setConfig(`remote.${remoteName}.gitCorsProxy`, gitCorsProxy);
  };
  getGitCorsProxy = async (remoteName: string): Promise<string | null> => {
    return this.getConfig(`remote.${remoteName}.gitCorsProxy`);
  };

  setAuthId = async (remoteName: string, authId: string): Promise<void> => {
    return this.setConfig(`remote.${remoteName}.authId`, authId);
  };
  getAuthId = async (remoteName: string): Promise<string | null> => {
    return this.getConfig(`remote.${remoteName}.authId`);
  };

  getRemoteAuthCallback = async (remoteName: string): Promise<AuthCallback | undefined> => {
    const authId = await this.getAuthId(remoteName);
    if (!authId) return undefined;

    try {
      const authRecord = await ClientDb.remoteAuths.get({ guid: authId });
      if (!authRecord) return undefined;

      if (isApiAuth(authRecord)) {
        const { apiKey, apiSecret } = authRecord.data;
        return () => ({
          username: apiKey,
          password: apiSecret || apiKey, //TODO i think wrong!!
        });
      } else if (isOAuthAuth(authRecord)) {
        const { accessToken } = authRecord.data;
        return () => ({
          username: accessToken,
          password: "", // OAuth typically only needs the token as username
        });
      }
    } catch (error) {
      console.warn(`Failed to load auth for remote ${remoteName}:`, error);
    }

    return undefined;
  };

  addGitRemote = async (remote: GitRemote): Promise<void> => {
    // await this.mustBeInitialized();
    const remotes = await this.git.listRemotes({ fs: this.fs, dir: this.dir });
    const uniqSlug = getUniqueSlug(
      remote.name,
      remotes.map((r) => r.remote)
    );
    await this.git.addRemote({
      fs: this.fs,
      dir: this.dir,
      remote: uniqSlug,
      url: remote.url,
    });
    if (remote.gitCorsProxy) await this.setGitCorsProxy(uniqSlug, remote.gitCorsProxy);
    if (remote.authId) await this.setAuthId(uniqSlug, remote.authId);
  };
  replaceGitRemote = async (previous: GitRemote, remote: GitRemote): Promise<void> => {
    // await this.mustBeInitialized();
    await this.deleteGitRemote(previous.name);
    await this.addGitRemote(remote);
  };

  deleteGitRemote = async (remoteName: string): Promise<void> => {
    // await this.mustBeInitialized();
    await this.git.deleteRemote({
      fs: this.fs,
      dir: this.dir,
      remote: remoteName,
    });
  };

  exists = async (): Promise<boolean> => {
    try {
      if (this.state.initialized) return true;
      await this.fs.stat(joinPath(this.dir, ".git"));
      await git.resolveRef({ fs: this.fs, dir: this.dir, ref: "HEAD" });
      return (this.state.initialized = true);
    } catch (_e) {
      // console.log(_e);

      return (this.state.initialized = false);
    }
  };

  currentRef = async (): Promise<string> => {
    // await this.mustBeInitialized();
    return git.resolveRef({
      fs: this.fs,
      dir: this.dir,
      ref: "HEAD",
    });
  };

  currentBranch = async ({ fullname = false }: { fullname: boolean }): Promise<string | void> => {
    // await this.mustBeInitialized();
    return this.git.currentBranch({
      fs: this.fs,
      dir: this.dir,
      fullname,
    });
  };

  writeRef = async ({ ref, value, force = false }: { ref: string; value: string; force: boolean }): Promise<void> => {
    // await this.mustBeInitialized();
    return this.git.writeRef({
      fs: this.fs,
      dir: this.dir,
      ref,
      value,
      force,
    });
  };

  convertGitRemoteToIRemote = async (gitRemote: GitRemote, branch: string): Promise<IRemote> => {
    const auth = await this.getRemoteAuthCallback(gitRemote.name);
    return {
      branch,
      name: gitRemote.name,
      url: gitRemote.url,
      auth,
    };
  };

  tearDown = () => {
    this.unsubs.forEach((unsub) => unsub());
    this.gitEvents.clearListeners();
  };
}
