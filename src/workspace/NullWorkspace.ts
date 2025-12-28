// import { NullRemoteAuth } from "@/data/RemoteOAuth";
import { NULL_FILE_TREE } from "@/components/filetree/Filetree";
import { NULL_TREE_ROOT } from "@/components/filetree/TreeNode";
import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { NullDisk } from "@/data/disk/NullDisk";
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

export const NULL_WORKSPACE = new NullWorkspace();
