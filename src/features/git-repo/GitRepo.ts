import { CommonFileSystem } from "@/Db/CommonFileSystem";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
import git, { AuthCallback } from "isomorphic-git";
import http from "isomorphic-git/http/web";

interface IRemote {
  branch: string;
  name: string;
  url: string;
  auth?: AuthCallback;
}

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
    SUCCESS: 0,
    BRANCH_NOT_FOUND: 1,
    NO_ACCESS: 2,
    UNEXPECTED_ERROR: 3,
  };

  async verifyRemote(): Promise<number> {
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

export class Repo {
  fs: CommonFileSystem;
  dir: AbsPath;
  branch: string;

  author: {
    email: string;
    name: string;
  } = {
    name: "Opal Editor",
    email: "user@opaleditor.com",
  };

  state: {
    initialized: boolean;
  } = {
    initialized: false,
  };

  New(fs: CommonFileSystem, dir: AbsPath = absPath("/"), branch: string = "main"): Repo {
    return new Repo({ fs, dir, branch });
  }
  constructor({
    fs,
    dir,
    branch,
    author,
  }: {
    fs: CommonFileSystem;
    dir: AbsPath;
    branch: string;
    author?: { email: string; name: string };
  }) {
    this.fs = fs;
    this.dir = dir;
    this.branch = branch;
    this.author = author || this.author;
  }

  async mustBeInitialized() {
    if (this.state.initialized) return true;
    if (!(await this.isInitialized())) {
      await git.init({
        fs: this.fs,
        dir: this.dir,
        defaultBranch: this.branch,
      });
    }
    return (this.state.initialized = true);
  }

  // async initRepo() {
  //   // Initialize a new git repository
  //   await git.init({
  //     fs: this.repo.fs,
  //     dir: this.repo.dir,
  //     defaultBranch: this.repo.branch,
  //   });
  // }

  async isInitialized(): Promise<boolean> {
    try {
      if (this.state.initialized) return true;
      await this.fs.readFile(joinPath(this.dir, ".git"));
      await git.resolveRef({ fs: this.fs, dir: this.dir, ref: "HEAD" });
      return (this.state.initialized = true);
    } catch (_e) {
      return (this.state.initialized = false);
    }
  }

  withRemote(remote: IRemote): RepoWithRemote {
    return new RepoWithRemote(
      {
        fs: this.fs,
        dir: this.dir,
        branch: this.branch,
        remoteBranch: remote.branch,
        remoteName: remote.name,
        url: remote.url,
        auth: remote.auth,
      },
      remote
    );
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
    super({ fs, dir, branch });
    this.remote = remote instanceof Remote ? remote : new Remote(remote);
  }
  get isRemoteOk() {
    return this.state.remoteOK;
  }
  async ready() {
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
class Playbook {
  constructor(private repo: Repo) {}

  async commit(message: string) {
    await git.commit({
      fs: this.repo.fs,
      dir: this.repo.dir,
      message,
      author: {
        name: "Your Name",
        email: "your@email.com",
      },
    });
  }

  async addRemote(remote: IRemote) {
    await git.addRemote({
      fs: this.repo.fs,
      dir: this.repo.dir,
      remote: remote.name,
      url: remote.url,
      force: true,
    });
    return this.repo.withRemote(remote);
  }
}

class RemotePlaybook extends Playbook {
  constructor(private repo: RepoWithRemote) {
    super(repo);
  }

  private async precommandCheck() {
    if (!this.repo.isRemoteOk) {
      await this.repo.assertRemoteOK({ verifyOrThrow: true });
    }
    if (!(await this.repo.ready())) {
    }
  }
  async push() {
    await this.precommandCheck();
    /*commit,push*/
    await git.push({
      fs: this.repo.fs,
      http,
      dir: this.repo.dir,
      remote: this.repo.remote.name,
      ref: this.repo.branch, // or any branch you want to push to
      onAuth: this.repo.remote.auth,
    });
  }
  async pull() {
    await this.precommandCheck();
    /*fetch,merge*/
    await git.fetch({
      fs: this.repo.fs,
      http,
      dir: this.repo.dir,
      remote: this.repo.remote.name,
      ref: this.repo.remote.branch, // or any branch you want to fetch from
      onAuth: this.repo.remote.auth,
    });
    await git.merge({
      fs: this.repo.fs,
      dir: this.repo.dir,
      ours: this.repo.branch, // or any branch you want to merge into
      theirs: this.repo.remote.branch, // or any branch you want to merge from
      fastForwardOnly: true, // Set to false if you want to allow non-fast-forward merges
    });
  }
  async syncWithRemote() {
    await this.precommandCheck();
    await this.repo.ready();
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
