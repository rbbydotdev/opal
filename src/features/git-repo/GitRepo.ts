import { Disk, DiskJType } from "@/Db/Disk";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { WatchPromiseMembers } from "@/features/git-repo/WatchPromiseMembers";
import { Channel } from "@/lib/channel";
import { deepEqual } from "@/lib/deepEqual";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { isWebWorker } from "@/lib/isServiceWorker";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import Emittery from "emittery";
import GIT, { AuthCallback, MergeResult } from "isomorphic-git";
import http from "isomorphic-git/http/web";

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

// Utility functions for GitRef
export const createBranchRef = (name: string): GitRef => ({
  value: name,
  type: "branch",
});

export const createCommitRef = (name: string): GitRef => ({
  value: name,
  type: "commit",
});

export const isCommitRef = (gitRef: GitRef): gitRef is GitRefCommit => gitRef.type === "commit";
export const isBranchRef = (gitRef: GitRef): gitRef is GitRefBranch => gitRef.type === "branch";

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
export type RepoCommit = {
  oid: string;
  commit: { message: string; author: { name: string; email: string; timestamp: number; timezoneOffset: number } };
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

export type GitRefType = "branch" | "commit";

export type GitRef = {
  value: string;
  type: GitRefType;
};

export type GitRefBranch = {
  value: string;
  type: "branch";
};
export type GitRefCommit = {
  value: string;
  type: "commit";
};
export const RepoDefaultInfo = {
  currentBranch: null as null | string,
  bareInitialized: false,
  fullInitialized: false,
  branches: [] as string[],
  remotes: [] as GitRemote[],
  latestCommit: {
    oid: "",
    date: 0,
    message: "",
    author: { name: "", email: "", timestamp: 0, timezoneOffset: 0 },
  },
  hasChanges: false,
  commitHistory: [] as Array<RepoCommit>,
  context: "" as "main" | "worker" | "",
  exists: false,
  isMerging: false,
  unmergedFiles: [] as string[],
  currentRef: null as null | GitRef,
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

export function isMergeConflictError(result: unknown): result is InstanceType<typeof GIT.Errors.MergeConflictError> {
  return result instanceof GIT.Errors.MergeConflictError;
}

export type MergeConflict = InstanceType<typeof GIT.Errors.MergeConflictError>["data"];
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

  private gitWpm = new WatchPromiseMembers(GIT);
  readonly git = this.gitWpm.watched;
  private readonly gitEvents = this.gitWpm.events;

  author: GitRepoAuthor = {
    name: "Opal Editor",
    email: "user@opaleditor.com",
  };

  state: {
    fullInitialized: boolean;
    bareInitialized: boolean;
  } = {
    fullInitialized: false,
    bareInitialized: false,
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
        "init:end",
      ],
      (propName) => {
        console.debug("git repo event: " + propName);
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

  async push({
    remote,
    ref,
    remoteRef,
    corsProxy,
    onAuth,
  }: {
    remote: string;
    ref: string;
    remoteRef?: string;
    corsProxy?: string;
    onAuth?: AuthCallback;
  }) {
    return this.git.push({
      fs: this.fs,
      http,
      dir: this.dir,
      remote,
      ref,
      remoteRef,
      corsProxy,
      onAuth,
    });
  }

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

  init({ skipListeners = false } = {}) {
    if (!skipListeners) this.unsubs.push(this.initListeners());
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
    if ((await this.fullInitialized()) === false) return false;
    const mergeHead = await this.getMergeState();
    return mergeHead !== null;
  };
  setMergeMsg = async (message: string | null) => {
    if (message === null) {
      await this.fs.unlink(joinPath(this.gitDir, "MERGE_MSG")).catch(() => {});
      return;
    }
    await this.fs.writeFile(joinPath(this.gitDir, "MERGE_MSG"), message);
  };
  getMergeMsg = async (): Promise<string | null> => {
    const mergeMsg = await this.fs.readFile(joinPath(this.gitDir, "MERGE_MSG")).catch(() => null);
    if (mergeMsg) {
      return String(mergeMsg).trim();
    }
    return null;
  };
  setMergeState = async (mergeHead: string | null) => {
    if (mergeHead !== null) {
      await this.fs.writeFile(joinPath(this.gitDir, "MERGE_HEAD"), mergeHead);
    } else {
      await this.fs.unlink(joinPath(this.gitDir, "MERGE_HEAD")).catch(() => {
        // Ignore if file does not exist
      });
    }
  };
  getMergeState = async () => {
    if (!(await this.fullInitialized())) return null;
    const mergeHead = await this.fs.readFile(joinPath(this.gitDir, "MERGE_HEAD")).catch(() => null);
    if (mergeHead) {
      return String(mergeHead).trim();
    }
    return null;
  };
  tryInfo = async (): Promise<RepoInfoType> => {
    try {
      // if (!(await this.fullInitialized())) {
      //   return RepoDefaultInfo;
      // }
      const currentBranch = await this.getCurrentBranch();
      const latestCommit = await this.getLatestCommit();
      const currentRef = currentBranch
        ? createBranchRef(currentBranch)
        : latestCommit.oid
          ? createCommitRef(latestCommit.oid)
          : null;
      const isMerging = await this.isMerging();
      return {
        fullInitialized: this.state.fullInitialized,
        bareInitialized: this.state.bareInitialized,
        currentBranch,
        branches: await this.getBranches(),
        remotes: await this.getRemotes(),
        latestCommit,
        hasChanges: await this.hasChanges(),
        commitHistory: await this.getCommitHistory({ depth: 20 }),
        context: isWebWorker() ? "worker" : "main",
        exists: await this.fullInitialized(),
        isMerging,
        currentRef,
        unmergedFiles: isMerging ? await this.getUnmergedFiles() : [],
      };
    } catch (e) {
      if (!(e instanceof GIT.Errors.NotFoundError)) {
        console.warn(e);
      }
      return RepoDefaultInfo;
    }
  };

  getUnmergedFiles = async (): Promise<string[]> => {
    if ((await this.fullInitialized()) === false) return [];
    const mergeHead = await this.getMergeState();
    if (mergeHead) {
      const unmergedFiles = await this.statusMatrix({
        ref: mergeHead,
      });
      return unmergedFiles
        .filter(([, head, workdir, stage]) => head !== workdir || workdir !== stage)
        .map(([filepath]) => joinPath(this.dir, filepath));
    }
    return [];
  };

  getCurrentBranch = async ({ fullname }: { fullname?: boolean } = {}): Promise<string | null> => {
    if ((await this.fullInitialized()) === false) return null;
    return (
      (await this.git.currentBranch({
        fs: this.fs,
        dir: this.dir,
        fullname,
      })) || null
    );
  };

  hasChanges = async (): Promise<boolean> => {
    if ((await this.fullInitialized()) === false) return false;
    try {
      const matrix = await this.mutex.runExclusive(() => GIT.statusMatrix({ fs: this.fs, dir: this.dir }));
      return matrix.some(([, head, workdir, stage]) => head !== workdir || workdir !== stage);
    } catch (error) {
      console.error("Error checking for changes:", error);
      return true;
    }
  };

  async setAuthor({ name, email }: { name: string; email: string }) {
    this.author = { name, email };
    await this.setConfig("user.name", name);
    await this.setConfig("user.email", email);
  }

  getBranches = async (): Promise<string[]> => {
    return await this.git.listBranches({
      fs: this.fs,
      dir: this.dir,
    });
  };

  isBranchOrTag = async (ref: string) => {
    const branches = await this.getBranches();
    const tags = await GIT.listTags({ fs: this.fs, dir: this.dir });
    return branches.includes(ref) || tags.includes(ref);
  };

  getRemote = async (name: string): Promise<(GitRemote & { RemoteAuth: RemoteAuthDAO | null }) | null> => {
    const remotes = await this.getRemotes();
    const remote = remotes.find((r) => r.name === name);
    if (remote) {
      if (remote.authId) {
        return { ...remote, RemoteAuth: await RemoteAuthDAO.GetByGuid(remote.authId) };
      }
      return { RemoteAuth: null, ...remote };
    }
    return null;
  };

  getRemotes = async (): Promise<GitRemote[]> => {
    if (!(await this.bareInitialized())) return [];
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
    if (!(await this.fullInitialized())) return RepoLatestCommitNull;
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

  getCommitHistory = async (options?: { depth?: number; ref?: string; filepath?: string }): Promise<RepoCommit[]> => {
    if (!(await this.fullInitialized())) return [];

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

  resolveRef = async ({ ref }: { ref: string }): Promise<string> => {
    return this.git.resolveRef({
      fs: this.fs,
      dir: this.dir,
      ref,
    });
  };

  getHead() {
    return GIT.resolveRef({ fs: this.fs, dir: this.dir, ref: "HEAD" });
  }

  merge = async ({ from, into }: { from: string; into: string }): Promise<MergeResult | MergeConflict> => {
    const result = await this.git
      .merge({
        fs: this.fs,
        dir: this.dir,
        author: this.author,
        ours: into,
        fastForward: true,
        theirs: from,
        abortOnConflict: false,
      })
      .catch(async (e) => {
        if (isMergeConflictError(e)) {
          console.log("Merge conflict detected:", { from, into }, e.data);
          await this.setMergeState(await GIT.resolveRef({ fs: this.fs, dir: this.dir, ref: from }));

          await this.setMergeMsg(`Merge branch '${from}' into '${into}'`);
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

    if (!isMergeConflict(result)) {
      await this.git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: into,
        force: true, // overwrite workdir with index
      });
    }
    return result;
  };

  mustBeInitialized = async (): Promise<boolean> => {
    if (this.state.fullInitialized) return true;
    if (!(await this.fullInitialized())) {
      await this.git.init({
        fs: this.fs,
        dir: this.dir,
        defaultBranch: this.defaultMainBranch,
      });
      this.state.bareInitialized = true;
      await this.sync();
    }
    return (this.state.bareInitialized = true);
  };

  commit = async ({
    message,
    author,
    parent,
    ref,
  }: {
    message: string;
    author?: GitRepoAuthor;
    ref?: string;
    parent?: string[];
  }): Promise<string> => {
    const result = await this.git.commit({
      fs: this.fs,
      dir: this.dir,
      author: author || this.author,
      ref,
      message,
      parent,
    });
    if (await this.isMerging()) {
      await this.resetMergeState();
    }
    return result;
  };
  private resetMergeState = async () => {
    await this.setMergeState(null);
    await this.setMergeMsg(null);
  };

  add = async (filepath: string | string[]): Promise<void> => {
    return this.git.add({
      fs: this.fs,
      dir: this.dir,
      filepath: Array.isArray(filepath) ? filepath : [filepath],
    });
  };

  remove = async (filepath: string | string[]): Promise<void> => {
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
    return await this.checkoutRef({ ref: this.defaultMainBranch });
  };

  checkoutRef = async ({ ref, force = true }: { ref: string; force?: boolean }): Promise<string | void> => {
    if (await this.isMerging()) {
      // throw new Error("Cannot checkout while merging. Please resolve conflicts first.");
      await this.resetMergeState();
    }
    await this.mutex.runExclusive(async () => {
      await this.git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: ref,
        force,
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
    symbolicRef = symbolicRef || this.defaultMainBranch;
    checkout = checkout ?? false;

    const branches = await this.git.listBranches({
      fs: this.fs,
      dir: this.dir,
    });
    const uniqueBranchName = getUniqueSlug(branchName, branches);
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

  statusMatrix = async ({ ref }: { ref?: string } = {}): Promise<Array<[string, number, number, number]>> => {
    return GIT.statusMatrix({ fs: this.fs, dir: this.dir, ref });
  };

  setConfig = async (path: string, value: string): Promise<void> => {
    await this.git.setConfig({
      fs: this.fs,
      dir: this.dir,
      path,
      value,
    });
  };
  getConfig = async (path: string): Promise<string | null> => {
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

  addGitRemote = async (remote: GitRemote): Promise<void> => {
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
    await this.deleteGitRemote(previous.name);
    await this.addGitRemote(remote);
  };

  deleteGitRemote = async (remoteName: string): Promise<void> => {
    await this.git.deleteRemote({
      fs: this.fs,
      dir: this.dir,
      remote: remoteName,
    });
  };

  bareInitialized = async (): Promise<boolean> => {
    try {
      if (this.state.bareInitialized) return true;
      await this.fs.stat(joinPath(this.dir, ".git"));
      return (this.state.bareInitialized = true);
    } catch (_e) {
      return (this.state.bareInitialized = false);
    }
  };
  fullInitialized = async (): Promise<boolean> => {
    try {
      if (this.state.fullInitialized) return true;
      if (!(await this.bareInitialized())) throw new Error("Not bare initialized");
      await this.fs.stat(joinPath(this.dir, ".git"));
      await GIT.resolveRef({ fs: this.fs, dir: this.dir, ref: "HEAD" });
      return (this.state.fullInitialized = true);
    } catch (_e) {
      return (this.state.fullInitialized = false);
    }
  };

  currentRef = async (): Promise<string> => {
    return GIT.resolveRef({
      fs: this.fs,
      dir: this.dir,
      ref: "HEAD",
    });
  };

  currentBranch = async ({ fullname = false }: { fullname: boolean }): Promise<string | void> => {
    return this.git.currentBranch({
      fs: this.fs,
      dir: this.dir,
      fullname,
    });
  };

  writeRef = async ({ ref, value, force = false }: { ref: string; value: string; force: boolean }): Promise<void> => {
    return this.git.writeRef({
      fs: this.fs,
      dir: this.dir,
      ref,
      value,
      force,
    });
  };

  tearDown = () => {
    this.unsubs.forEach((unsub) => unsub());
    this.gitEvents.clearListeners();
  };
}
