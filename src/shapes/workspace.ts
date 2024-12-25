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
