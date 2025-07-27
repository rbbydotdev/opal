import { NullDisk } from "@/Db/Disk";
// import { NullRemoteAuth } from "@/Db/RemoteOAuth";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";

export class NullWorkspace extends Workspace {
  async init() {
    return this;
  }
  isNull = true;
  constructor() {
    super(
      {
        name: "",
        guid: "",
        disk: new NullDisk(),
        remoteAuths: [],
        thumbs: new NullDisk(),
      },
      {} as WorkspaceDAO
    );
  }
}
