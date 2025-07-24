import { CommonFileSystem } from "@/Db/CommonFileSystem";
import git from "isomorphic-git";
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
