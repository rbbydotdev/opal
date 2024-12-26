import { Disk } from "@/disk/disk";

export class Workspace {
  constructor(public readonly disk: Disk) {
    console.log("Workspace constructor");
  }
  hydrate() {
    console.log("Workspace hydrate");
    this.disk.hydrate();
  }
}

class LocalWorkspace extends Workspace {
  constructor(public readonly disk: Disk) {
    super(disk);
    console.log("LocalWorkspace constructor");
  }
  hydrate() {
    console.log("LocalWorkspace hydrate");
    super.hydrate();
  }
}

class GithubWorkspace extends Workspace {
  constructor(public readonly disk: Disk) {
    super(disk);
    console.log("GithubWorkspace constructor");
  }
  hydrate() {
    console.log("GithubWorkspace hydrate");
    super.hydrate();
  }
}
