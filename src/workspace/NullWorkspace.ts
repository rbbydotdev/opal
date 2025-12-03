// import { NullRemoteAuth } from "@/data/RemoteOAuth";
import { WorkspaceDAO } from "@/data/DAO/WorkspaceDAO";
import { NullDisk } from "@/data/disk/NullDisk";
import { NULL_FILE_TREE } from "@/lib/FileTree/Filetree";
import { NULL_TREE_ROOT } from "@/lib/FileTree/TreeNode";
import { Workspace } from "@/workspace/Workspace";

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
