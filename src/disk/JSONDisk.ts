import { Disk, FSJType, IndexedDbDisk, MemDisk } from "@/disk/disk";

//TODO: Destroy me
export class JSONDisk extends Disk {
  async toJSON_() {
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
