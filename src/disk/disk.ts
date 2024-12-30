import LightningFs from "@isomorphic-git/lightning-fs";
import { memfs } from "memfs";

export type FSJType = { guid: string; type: FSTypes; fs: Record<string, string> };

export type FSTypes = IndexedDbDisk["type"] | MemDisk["type"];

export abstract class Disk {
  abstract readonly type: FSTypes;
  abstract readonly guid: string;
  abstract fs: InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];
  abstract mount(): Promise<void>;

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
    return { type: this.type, fs: result, guid: this.guid } as FSJType;
  }
  static async fromJSON(json: FSJType) {
    const fs = json.fs;
    const instance = json.type === "IndexedDbDisk" ? new IndexedDbDisk(json.guid) : new MemDisk(json.guid);
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

export class IndexedDbDisk extends Disk {
  readonly type = "IndexedDbDisk";
  public readonly fs: InstanceType<typeof LightningFs>;
  async mount() {
    await this.fs.init(this.guid); //needed?
  }

  constructor(public readonly guid: string) {
    super();
    //TODO: i am not sure if this should be moved out of the constructor and into the module or not
    this.fs = new LightningFs(guid);
  }
}

export class MemDisk extends Disk {
  readonly type = "MemDisk";
  public readonly fs: ReturnType<typeof memfs>["fs"];

  constructor(public readonly guid: string) {
    super();
    this.fs = memfs().fs;
  }
  async mount() {}
}

export function newDisk(type: FSTypes, guid: string) {
  return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
}
