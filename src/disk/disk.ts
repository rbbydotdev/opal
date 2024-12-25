import LightningFs from "@isomorphic-git/lightning-fs";
import { memfs } from "memfs";

type FSJType = { id: string; type: FSTypes; fs: Record<string, string> };

type FSTypes = LightningDisk["type"] | MemDisk["type"];

export abstract class Disk {
  abstract readonly type: FSTypes;
  abstract readonly id: string;
  abstract fs: InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];
  abstract hydrate(): Promise<void>;

  get promises() {
    return this.fs.promises;
  }

  async toJSON() {
    const result: Record<string, string> = {};
    const traverse = async (dir: string) => {
      const entries = await this.promises.readdir(dir);
      for (const entry of entries) {
        if (typeof entry === "string" || Buffer.isBuffer(entry)) {
          const entryName = entry.toString("utf8");
          // Handle case where entry is a string (name of the file or directory)
          const fullPath = `${dir}/${entryName}`;
          // Handle case where entry is a string (name of the file or directory)
          try {
            const stat = await this.promises.stat(fullPath);
            if (stat.isDirectory()) {
              await traverse(fullPath);
            } else if (stat.isFile()) {
              const content = await this.promises.readFile(fullPath, "utf8");
              result[fullPath] = content.toString("utf8");
            }
          } catch (err) {
            console.error(`Error reading ${fullPath}:`, err);
          }
        } else if (entry && typeof entry.name === "string") {
          // Handle case where entry is a Dirent object
          const fullPath = `${dir}/${entry.name}`;
          if (entry.isDirectory()) {
            await traverse(fullPath);
          } else if (entry.isFile()) {
            const content = await this.promises.readFile(fullPath, "utf8");
            result[fullPath] = content.toString();
          }
        }
      }
    };
    await traverse("/");
    return { type: this.type, fs: result, id: this.id } as FSJType;
  }
  static async fromJSON(json: FSJType) {
    const fs = json.fs;
    const instance = json.type === "LightningDisk" ? new LightningDisk(json.id) : new MemDisk(json.id);
    for (const [fullPath, content] of Object.entries(fs)) {
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
      try {
        // Ensure the directory exists
        await instance.promises.mkdir(dirPath, { recursive: true, mode: 0o777 });
      } catch (err) {
        console.error(`Error creating directory ${dirPath}:`, err);
      }

      try {
        // Write the file content
        await instance.promises.writeFile(fullPath, content, "utf8");
      } catch (err) {
        console.error(`Error writing file ${fullPath}:`, err);
      }
    }
    return instance;
  }
}

export class LightningDisk extends Disk {
  readonly type = "LightningDisk";
  public readonly fs: InstanceType<typeof LightningFs>;
  async hydrate() {}

  constructor(public readonly id: string) {
    super();
    this.fs = new LightningFs(id);
  }
}

export class MemDisk extends Disk {
  readonly type = "MemDisk";
  public readonly fs: ReturnType<typeof memfs>["fs"];

  constructor(public readonly id: string) {
    super();
    this.fs = memfs().fs;
  }
  async hydrate() {}
}
