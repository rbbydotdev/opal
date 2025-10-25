// import { NullRemoteAuth } from "@/Db/RemoteOAuth";
import { NullDisk } from "@/Db/NullDisk";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { NULL_FILE_TREE } from "@/lib/FileTree/Filetree";
import { NULL_TREE_ROOT } from "@/lib/FileTree/TreeNode";

export class NullWorkspace extends Workspace {
  async init() {
    return this;
  }
  getFileTreeRoot = () => {
    return NULL_TREE_ROOT;
  };
  getFileTree() {
    return NULL_FILE_TREE;
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
