import { CommonFileSystem } from "@/Db/CommonFileSystem";
import { absPath, AbsPath } from "@/lib/paths2";
import git, { AuthCallback } from "isomorphic-git";
import http from "isomorphic-git/http/web";

interface Remote {
  branch: string;
  name: string;
  url: string;
  auth?: AuthCallback;
}

export class Repo {
  fs: CommonFileSystem;
  dir: AbsPath;
  branch: string;

  New(fs: CommonFileSystem, dir: AbsPath = absPath("/"), branch: string = "main"): Repo {
    return new Repo({ fs, dir, branch });
  }
  constructor({ fs, dir, branch }: { fs: CommonFileSystem; dir: AbsPath; branch: string }) {
    this.fs = fs;
    this.dir = dir;
    this.branch = branch;
  }
  withRemote(remote: Remote): RepoWithRemote {
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
    remote: Remote
  ) {
    super({ fs, dir, branch });
    this.remote = remote;
  }
}
class Playbook {
  constructor(private repo: Repo) {}
  async addRemote(remote: Remote) {
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

  async initRepo() {
    // Initialize a new git repository
    await git.init({
      fs: this.repo.fs,
      dir: this.repo.dir,
    });
  }
  async push() {
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
    /*commit,fetch,merge,push*/
    await this.initRepo()
      .then(() => this.pull())
      .then(() => this.push())
      .catch((error) => {
        console.error("Error syncing with remote:", error);
      });
  }
}

// export class GitRepo {
//   private fs: CommonFileSystem;
//   private dir: string;

//   constructor(fs: CommonFileSystem, dir: string) {
//     this.fs = fs;
//     this.dir = dir;
//   }

//   async clone(url: string, options?: Parameters<typeof git.clone>[0]) {
//     return git.clone({
//       fs: this.fs,
//       dir: this.dir,
//       http,
//       url,
//       ...options,
//     });
//   }

//   async status(filepath: string) {
//     return git.status({
//       fs: this.fs,
//       dir: this.dir,
//       filepath,
//     });
//   }

//   async add(filepath: string) {
//     return git.add({
//       fs: this.fs,
//       dir: this.dir,
//       filepath,
//     });
//   }

//   async commit(message: string, author: { name: string; email: string }) {
//     return git.commit({
//       fs: this.fs,
//       dir: this.dir,
//       message,
//       author,
//     });
//   }

//   async log(options?: Partial<Parameters<typeof git.log>[0]>) {
//     return git.log({
//       fs: this.fs,
//       dir: this.dir,
//       ...options,
//     });
//   }

//   // Add more methods as needed...
// }
