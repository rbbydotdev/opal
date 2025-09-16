import { Disk, DiskJType } from "@/Db/Disk";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { WatchPromiseMembers } from "@/features/git-repo/WatchPromiseMembers";
import { Channel } from "@/lib/channel";
import { deepEqual } from "@/lib/deepEqual";
import { NotFoundError } from "@/lib/errors";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { isWebWorker } from "@/lib/isServiceWorker";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import Emittery from "emittery";
import GIT, { AuthCallback, MergeResult } from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { gitAbbreviateRef } from "./gitAbbreviateRef";

export const OPAL_AUTHOR: GitRepoAuthor = {
  name: "Opal Editor",
  email: "user@opaleditor.com",
};

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
  defaultBranch: "main",
  branches: [] as string[],
  remotes: [] as GitRemote[],
  latestCommit: {
    oid: "",
    date: 0,
    message: "",
    author: { name: "", email: "", timestamp: 0, timezoneOffset: 0 },
  },
  remoteRefs: [] as string[],
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

export function isMergeNotSupportedError(
  result: unknown
): result is InstanceType<typeof GIT.Errors.MergeNotSupportedError> {
  return result instanceof GIT.Errors.MergeNotSupportedError;
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
  // private readonly $p = Promise.withResolvers<RepoInfoType>();
  // public readonly ready = this.$p.promise;
  private unsubs: (() => void)[] = [];
  private info: RepoInfoType | null = null;

  private gitWpm = new WatchPromiseMembers(GIT);
  readonly git = this.gitWpm.watched;
  private readonly gitEvents = this.gitWpm.events;

  author: GitRepoAuthor = OPAL_AUTHOR;

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

  // Helper functions for ref name normalization
  private toShortBranchName(ref: string): string {
    if (ref.startsWith("refs/heads/")) {
      return ref.slice("refs/heads/".length);
    }
    if (ref.startsWith("refs/remotes/")) {
      // For remote refs, return the branch part after remote name
      const parts = ref.slice("refs/remotes/".length).split("/");
      return parts.slice(1).join("/"); // Remove remote name, keep branch
    }
    if (ref.startsWith("refs/tags/")) {
      return ref.slice("refs/tags/".length);
    }
    return ref;
  }

  private toFullBranchRef(ref: string): string {
    if (ref.startsWith("refs/")) {
      return ref; // Already a full ref
    }
    return `refs/heads/${ref}`;
  }

  private toFullRemoteRef(remote: string, branch: string): string {
    return `refs/remotes/${remote}/${this.toShortBranchName(branch)}`;
  }

  private async normalizeRef({ ref }: { ref: string }) {
    if (
      ["HEAD", "ORIG_HEAD", "PREV_BRANCH", "FETCH_HEAD", "MERGE_HEAD", "CHERRY_PICK_HEAD", "REBASE_HEAD"].includes(ref)
    ) {
      return ref; // special refs that git understands
    }

    if (ref.startsWith("refs/")) {
      return ref;
    }

    // Case 2: shorthand for remote branch `"origin/main"`
    if (ref.includes("/")) {
      const [remote, branch] = ref.split("/", 2);
      const remoteRef = `refs/remotes/${remote}/${branch}`;
      try {
        await this.resolveRef({ ref: remoteRef });
        return remoteRef;
      } catch {
        /* fall through if not valid */
      }
    }

    // Case 3: local branch
    const localRef = `refs/heads/${ref}`;
    try {
      await this.resolveRef({ ref: localRef });
      return localRef;
    } catch {
      /* fall through */
    }

    // Case 4: tag
    const tagRef = `refs/tags/${ref}`;
    try {
      await this.resolveRef({ ref: tagRef });
      return tagRef;
    } catch {
      /* fall through */
    }

    // Case 5: maybe it's actually an OID
    try {
      await this.git.readCommit({ fs: this.fs, dir: this.dir, oid: ref });
      return ref; // it's a valid commit oid
    } catch {
      // nope
    }

    throw new Error(`Unable to resolve ref "${ref}" to a branch, remote, tag, or commit oid`);
  }

  private toFullTagRef(tag: string): string {
    if (tag.startsWith("refs/tags/")) {
      return tag;
    }
    return `refs/tags/${tag}`;
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
        "fetch:end",
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

  fetch = async ({ url, corsProxy, onAuth }: { url: string; corsProxy?: string; onAuth?: AuthCallback }) => {
    return this.mutex.runExclusive(async () => {
      return this.git.fetch({
        fs: this.fs,
        http,
        corsProxy,
        url,
        dir: this.dir,
        onAuth: onAuth,
        singleBranch: false,
      });
    });
  };

  // async pull({ ref }: { ref: string }) {
  //   return this.git.pull({
  //     fs: this.fs,
  //     http,
  //     dir: this.dir,
  //     ref,
  //   });
  // }

  async push({
    remote,
    ref,
    remoteRef,
    corsProxy,
    onAuth,
  }: {
    remote: string;
    ref?: string;
    remoteRef?: string;
    corsProxy?: string;
    onAuth?: AuthCallback;
  }) {
    const finalRef = ref || (await this.currentBranch()) || null;
    if (!finalRef) throw new Error("No current branch to push");
    return this.git.push({
      fs: this.fs,
      http,
      dir: this.dir,
      remote,
      ref: await this.normalizeRef({ ref: finalRef }),
      remoteRef,
      corsProxy,
      onAuth,
    });
  }

  async pull({ remote, ref }: { remote: string; ref?: string }) {
    const finalRef = ref || (await this.currentBranch()) || null;
    if (!finalRef) throw new Error("No current branch to pull");
    const remoteObj = await this.getRemote(remote);
    if (!remoteObj) throw new NotFoundError(`Remote ${remote} not found`);
    return this.mutex.runExclusive(async () => {
      return this.git.pull({
        fs: this.fs,
        http,
        dir: this.dir,
        ref: await this.normalizeRef({ ref: finalRef }),
        remote,
        singleBranch: true,
        fastForwardOnly: false,
        onAuth: remoteObj.onAuth,
        corsProxy: remoteObj.gitCorsProxy,
      });
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
    // await this.$p.resolve(newInfo);
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

  async isCleanFs() {
    return (await this.fs.readdir(this.dir)).length === 0;
  }

  watch(callback: () => void) {
    const unsub: (() => void)[] = [];
    unsub.push(
      this.gitEvents.on(
        [
          "commit:end",
          "checkout:end",
          "pull:end",
          "push:end",
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
  getRemoteRefs = async (remote?: string) => {
    if (!(await this.bareInitialized())) return [];
    return GIT.listRefs({ fs: this.fs, dir: this.dir, filepath: `refs/remotes${remote ? "/" + remote : ""}` }).catch(
      () => []
    );
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
        defaultBranch: await this.getDefaultBranch(),
        fullInitialized: this.state.fullInitialized,
        bareInitialized: this.state.bareInitialized,
        remoteRefs: await this.getRemoteRefs(),
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

  getRemote = async (
    name: string
  ): Promise<(GitRemote & { RemoteAuth: RemoteAuthDAO | null; onAuth?: AuthCallback }) | null> => {
    const remotes = await this.getRemotes();
    const remote = remotes.find((r) => r.name === name);
    if (!remote) return null;
    if (remote.authId) {
      const RemoteAuth = await RemoteAuthDAO.GetByGuid(remote.authId);
      if (!RemoteAuth) {
        throw new NotFoundError("Remote auth not found");
      }
      return { ...remote, RemoteAuth, onAuth: RemoteAuth?.toAgent()?.onAuth };
    }
    return { ...remote, RemoteAuth: null };
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

  async hasHEAD() {
    return this.resolveRef({ ref: "HEAD" })
      .catch(() => false)
      .then(() => true);
  }

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
        ours: await this.normalizeRef({ ref: into }),
        fastForward: true,
        theirs: await this.normalizeRef({ ref: from }),
        abortOnConflict: false,
        allowUnrelatedHistories: true,
      })
      .catch(async (e) => {
        if (isMergeConflictError(e)) {
          // console.log("Merge conflict detected:", { from, into }, e.data);
          await this.setMergeState(await GIT.resolveRef({ fs: this.fs, dir: this.dir, ref: from }));

          await this.setMergeMsg(`Merge branch '${from}' into '${into}'`);
          // console.log(
          //   await Promise.all(
          //     e.data.filepaths.map((fp) => this.fs.readFile(joinPath(absPath("/"), fp)).then((c) => c.toString()))
          //   )
          // );

          return structuredClone(e.data);
        } else {
          throw e;
        }
      });

    if (!isMergeConflict(result)) {
      await this.git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: await this.normalizeRef({ ref: into }),
        force: true, // overwrite workdir with index
      });
    }
    return result;
  };

  mustBeInitialized = async (defaultBranch = this.defaultMainBranch): Promise<boolean> => {
    if (this.state.fullInitialized) return true;
    if (!(await this.fullInitialized())) {
      //if we are bare intialized we may have fetched refs we dont want to collide with
      // const branches = await this.getBranches().catch(() => []);
      await this.git.init({
        fs: this.fs,
        dir: this.dir,
        defaultBranch,
      });
      this.state.bareInitialized = true;
      await this.setDefaultBranch(gitAbbreviateRef(defaultBranch));

      await this.sync();
    }
    this.state.bareInitialized = true;
    return true;
  };

  reset = async () => {
    await this.disk.removeFile(this.gitDir);
    this.state = { bareInitialized: false, fullInitialized: false };
    await this.sync();
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

  checkoutRef = async ({
    ref,
    force = false,
    remote,
  }: {
    ref: string;
    force?: boolean;
    remote?: string;
  }): Promise<string | void> => {
    if (await this.isMerging()) await this.resetMergeState();
    const fullRef = await this.normalizeRef({ ref });
    await this.mutex.runExclusive(async () => {
      await this.git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: fullRef,
        remote,
        force,
      });
      if (fullRef.startsWith("refs/heads/") || fullRef.startsWith("refs/tags/")) {
        await this.rememberCurrentBranch();
      }
      await this.git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref: fullRef,
        remote,
        force,
      });
    });
    return fullRef;
  };

  addGitBranch = async ({
    branchName,
    symbolicRef,
    checkout,
  }: {
    branchName: string;
    symbolicRef?: string;
    checkout?: boolean;
  }): Promise<string> => {
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

  setDefaultBranch = async (branchName: string): Promise<void> => {
    await this.setConfig("defaultBranch.name", branchName);
    this.defaultMainBranch = gitAbbreviateRef(branchName)!;
  };
  getDefaultBranch = async (): Promise<string> => {
    const branch = (await this.getConfig("defaultBranch.name")) || this.defaultMainBranch;
    this.defaultMainBranch = branch;
    return branch;
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

  addGitRemote = async (remote: GitRemote): Promise<GitRemote> => {
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
    return remote;
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

  currentBranch = async ({ fullname = false }: { fullname?: boolean } = {}): Promise<string | void> => {
    return this.git.currentBranch({
      fs: this.fs,
      dir: this.dir,
      fullname,
    });
  };

  writeRef = async ({
    ref,
    value,
    force = false,
    symbolic,
  }: {
    ref: string;
    value: string;
    force?: boolean;
    symbolic?: boolean;
  }): Promise<void> => {
    // Normalize ref to full format for writeRef
    const shortRef = this.toShortBranchName(ref);
    const branches: string[] = await this.getBranches().catch(() => []);
    const fullRef = branches.includes(shortRef) ? this.toFullBranchRef(shortRef) : ref;

    return this.git.writeRef({
      fs: this.fs,
      dir: this.dir,
      ref: fullRef,
      value,
      force,
      symbolic,
    });
  };

  tearDown = () => {
    this.unsubs.forEach((unsub) => unsub());
    this.gitEvents.clearListeners();
  };
}
