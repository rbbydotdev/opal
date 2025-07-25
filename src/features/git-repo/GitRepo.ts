import { CommonFileSystem } from "@/Db/CommonFileSystem";
import { AbsPath } from "@/lib/paths2";
import git, { AuthCallback } from "isomorphic-git";
import http from "isomorphic-git/http/web";
export class GitRepo {
  private fs: CommonFileSystem;
  private dir: string;

  constructor(fs: CommonFileSystem, dir: string) {
    this.fs = fs;
    this.dir = dir;
  }

  async clone(url: string, options?: Parameters<typeof git.clone>[0]) {
    return git.clone({
      fs: this.fs,
      dir: this.dir,
      http,
      url,
      ...options,
    });
  }

  async status(filepath: string) {
    return git.status({
      fs: this.fs,
      dir: this.dir,
      filepath,
    });
  }

  async add(filepath: string) {
    return git.add({
      fs: this.fs,
      dir: this.dir,
      filepath,
    });
  }

  async commit(message: string, author: { name: string; email: string }) {
    return git.commit({
      fs: this.fs,
      dir: this.dir,
      message,
      author,
    });
  }

  async log(options?: Partial<Parameters<typeof git.log>[0]>) {
    return git.log({
      fs: this.fs,
      dir: this.dir,
      ...options,
    });
  }

  // Add more methods as needed...
}

class Repo {
  fs: CommonFileSystem;
  dir: AbsPath;
  branch: string;
  url: string;
  remote: string;

  auth: AuthCallback;

  static New() {
    return new Repo({});
  }
  constructor({
    fs,
    dir,
    branch,
    url,
    remote,
    auth,
  }: {
    fs: CommonFileSystem;
    dir: AbsPath;
    branch: string;
    url: string;
    remote: string;
    auth: AuthCallback;
  }) {
    this.fs = fs;
    this.auth = auth;
    this.dir = dir;
    this.branch = branch;
    this.url = url;
    this.remote = remote;
  }
}

export class GitPlaybook {
  constructor(private repo: Repo) {}

  async initRepo(repo?: Repo) {
    // Initialize a new git repository
    await git.init({
      fs: this.repo.fs,
      dir: this.repo.dir,
    });
    await git.addRemote({
      fs: this.repo.fs,
      dir: this.repo.dir,
      remote: this.repo.remote,
      url: this.repo.url,
      force: true,
    });
  }
  async push() {
    /*commit,push*/
    await git.push({
      fs: this.repo.fs,
      http,
      dir: this.repo.dir,
      remote: this.repo.remote,
      ref: this.repo.branch, // or any branch you want to push to
      onAuth: this.repo.auth,
    });
  }
  async pull({ remoteBranch = "main" }: { remoteBranch?: string } = {}) {
    /*fetch,merge*/
    await git.pull({
      fs: this.repo.fs,
      http,
      dir: this.repo.dir,
      remote: this.repo.remote,
      ref: remoteBranch,
      onAuth: this.repo.auth,
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
