import { NullDisk } from "@/Db/Disk";
import { NullRemoteAuth } from "@/Db/RemoteAuth";
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
        remoteAuth: new NullRemoteAuth(),
        thumbs: new NullDisk(),
      },
      {} as WorkspaceDAO
    );
  }
}
