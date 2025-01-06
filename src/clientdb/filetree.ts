import { FsType } from "@/clientdb/Disk";
import { ChannelEmittery } from "@/lib/channel";
import { absPath } from "@/lib/paths";
import { Mutex } from "async-mutex";
import Emittery from "emittery";

export type TreeNode = TreeDir | TreeFile;

export type TreeList = Array<string>;

export type TreeDir = {
  children: Array<TreeNode>;
  name: string;
  type: "dir";
  path: string;
  depth: number;
};

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  depth: number;
};

// export type EmptyFileTreeType = typeof EmptyFileTree;

export class FileTree {
  static INDEX = "index";
  static REMOTE_INDEX = "remoteindex";

  static EmptyFileTree = () =>
    ({
      name: "/",
      path: "/",
      type: "dir",
      children: [],
      depth: 0,
    } as TreeDir);

  initialIndex = false;
  root: TreeDir = FileTree.EmptyFileTree();
  dirs: TreeList = [];

  broadcaster: ChannelEmittery;

  // private tree: TreeDir = this.root;
  constructor(private fs: FsType, public id: string) {
    // const key = "IndexedDbDisk/fileTree/" + id;
    this.broadcaster = new ChannelEmittery(id + "/fileTree"); //???
    // this.watchRemote(() => this.remoteIndexed());
    this.initCacheIndex();
    this.index();
  }
  initCacheIndex() {
    const indexCacheKey = `IndexedDbDisk/fileTree/${this.id}`;
    const cacheIndex = localStorage.getItem(indexCacheKey);
    if (cacheIndex) {
      try {
        const treeDir = JSON.parse(cacheIndex);
        this.root = treeDir;
        this.dirs = this.flatDirTree();
        this.initialIndex = true;
        this.emitter.emit(FileTree.INDEX, ++this.currentIndexId);
      } catch (_e) {
        localStorage.removeItem(indexCacheKey);
      }
    }
    this.watch((treeDir) => {
      localStorage.setItem(indexCacheKey, JSON.stringify(treeDir));
    });
  }
  private emitter = new Emittery();
  private mutex = new Mutex();
  private currentIndexId: number = 0;

  getRootTree() {
    return this.root;
  }

  flatDirTree = () => {
    const flat: TreeList = [];
    this.walk((node) => {
      if (node.type === "dir") {
        flat.push(node.path);
      }
    });
    return flat;
  };

  reIndex = () => {
    return this.index({ force: true });
  };

  remoteIndexed = () => {
    return this.index({ force: true, notifyRemote: false });
  };
  index = async (
    { force, notifyRemote }: { force: boolean; notifyRemote?: boolean } = { force: false, notifyRemote: true }
  ) => {
    if (force || !this.initialIndex) {
      const release = await this.mutex.acquire();
      try {
        this.root = FileTree.EmptyFileTree();
        await this.recurseTree(this.root.path, this.root.children, 0);
        this.dirs = this.flatDirTree();
        this.initialIndex = true;
        //compare with the previous index ???
        this.emitter.emit(FileTree.INDEX, ++this.currentIndexId);
        if (notifyRemote) this.broadcaster.emit(FileTree.REMOTE_INDEX);
      } finally {
        release(); // Release the lock
      }
    }

    return this;
  };

  async getFirstFile(): Promise<TreeFile | null> {
    await this.index();
    let first = null;
    this.walk((file, _, exit) => {
      if (file.type === "file") {
        first = file;
        exit();
      }
    });
    return first;
  }

  onInitialIndex(callback: (fileTreeDir: TreeDir) => void) {
    if (this.initialIndex) {
      callback(this.getRootTree());
    } else {
      this.emitter.once(FileTree.INDEX).then(() => {
        callback(this.getRootTree());
      });
    }
  }

  //race will call callback if there is already a fresh initialized index
  watch(callback: (fileTree: TreeDir, indexId: number) => void, { race }: { race: boolean } = { race: true }) {
    let lastHandledIndexId = -1;
    if (race) callback(this.root, Infinity);
    return this.emitter.on(FileTree.INDEX, (indexId: number) => {
      if (indexId !== lastHandledIndexId) {
        lastHandledIndexId = indexId;
        callback(this.root, indexId);
      }
    });
  }
  watchRemote(callback: () => void) {
    return this.broadcaster.on(FileTree.REMOTE_INDEX, callback);
  }

  teardown() {
    this.emitter.clearListeners();
    this.broadcaster.clearListeners();
  }

  walk(
    cb: (node: TreeNode, depth: number, exit: () => void) => void,
    node: TreeNode = this.root,
    depth = 0,
    status = { exit: false }
  ) {
    const exit = () => (status.exit = true);
    cb(node, depth, exit);
    for (const childNode of (node as TreeDir).children ?? []) {
      if (status.exit) break;
      this.walk(cb, childNode, depth + 1, status);
    }
  }

  private recurseTree = async (dir: string, parent: TreeNode[] = [], depth = 0, haltOnError = false) => {
    try {
      const entries = await this.fs.promises.readdir(dir);
      for (const entry of entries) {
        const fullPath = absPath(dir).join(entry.toString()).str;
        const stat = await this.fs.promises.stat(fullPath);
        let nextParent = null;
        let treeEntry: TreeDir | TreeFile | string = "";

        if (stat.isDirectory()) {
          treeEntry = { name: entry.toString(), depth, type: "dir", path: fullPath, children: [] };
          nextParent = treeEntry.children;
          await this.recurseTree(fullPath, nextParent, depth + 1, haltOnError);
        } else {
          treeEntry = {
            name: entry.toString(),
            depth,
            type: "file",
            path: fullPath,
          };
        }
        parent.push(treeEntry);
      }
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
    }
  };
}
