import { TreeNode } from "@/components/sidebar/FileTree/TreeNode";
import { Disk } from "@/data/disk/Disk";
import { createThumbnail } from "@/lib/createThumbnail";
import { NotFoundError } from "@/lib/errors";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";

export class Thumb {
  constructor(
    protected cache: Promise<Cache>,
    protected thumbRepo: Disk,
    protected imgRepo: Disk,
    public path: AbsPath,
    protected content: Uint8Array | null = null,
    protected readonly size = 100
  ) {}

  static isThumbURL(url: string | URL) {
    if (typeof url === "string") {
      try {
        url = new URL(url);
      } catch (_e) {
        return false;
      }
    }
    return url.searchParams.has("thumb");
  }
  static pathToURL({ path, workspaceName, size = 100 }: { path: AbsPath; workspaceName?: string; size?: number }) {
    if (path.endsWith(".svg")) {
      return absPath(path);
    }
    const params = new URLSearchParams();
    params.set("thumb", size.toString());
    if (workspaceName) {
      params.set("workspaceName", workspaceName);
    }
    return absPath(path + "?" + params.toString());
  }
  static resolveURLFromNode(node: TreeNode) {
    return absPath(Thumb.pathToURL({ path: node.isDupNode() ? node.source : node.path }));
  }
  async save() {
    await this.thumbRepo.writeFileRecursive(this.path, this.content!);
    return this;
  }

  getSourcePath() {
    return this.path;
  }
  async readOrMake() {
    if (await this.exists()) {
      return this.read();
    }
    return (await this.make()).read();
  }

  async make() {
    const content = await this.imgRepo.readFile(this.getSourcePath());
    if (!content) throw new NotFoundError("Image not found for thumb" + this.path);
    this.content = await createThumbnail(content as Uint8Array, this.size, this.size);
    await this.save();
    return this;
  }

  exists() {
    return this.thumbRepo.pathExists(this.path);
  }
  async read() {
    return this.content || (this.content = (await this.thumbRepo.readFile(this.path)) as Uint8Array);
  }

  url() {
    return this.path + "?thumb=" + this.size;
  }

  async move(oldPath: AbsPath, newPath: AbsPath) {
    const oldUrl = this.url();
    this.path = newPath;
    await this.cache.then(async (c) => {
      const res = await c.match(oldUrl);
      if (res) {
        void c.put(this.url(), res);
        void c.delete(oldUrl);
      }
    });
    return this.thumbRepo.quietMove(oldPath, newPath, { overWrite: true });
  }

  async remove() {
    await this.cache.then((c) => c.delete(this.url()));
    await this.thumbRepo.removeFile(this.path);
  }
}

export class NamespacedThumb extends Thumb {
  constructor(
    protected cache: Promise<Cache>,
    protected imgRepo: Disk,
    public path: AbsPath,
    protected namespace: string,
    protected content: Uint8Array | null = null,
    protected readonly size = 100
  ) {
    super(cache, imgRepo, imgRepo, path, content, size);
    this.path = joinPath(absPath(namespace), path);
  }

  getSourcePath() {
    return absPath(this.path.slice(absPath(this.namespace).length));
  }
}
