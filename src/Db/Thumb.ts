import { Disk } from "@/Db/Disk";
import { createThumbnailWW } from "@/lib/createThumbnailWW";
import { NotFoundError } from "@/lib/errors";
import { AbsPath, encodePath } from "@/lib/paths2";

export class Thumb {
  constructor(
    protected cache: Promise<Cache>,
    protected thumbRepo: Disk,
    protected imgRepo: Disk,
    protected path: AbsPath,
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
  async save() {
    await this.thumbRepo.writeFileRecursive(this.path, this.content!);
    return this;
  }
  async readOrMake() {
    if (await this.exists()) {
      return this.read();
    }
    return (await this.make()).read();
  }

  async make() {
    const content = await this.imgRepo.readFile(this.path);
    if (!content) throw new NotFoundError("Image not found for thumb" + this.path);
    this.content = await createThumbnailWW(content as Uint8Array, this.size, this.size);
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
    return encodePath(this.path) + "?thumb=" + this.size;
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
