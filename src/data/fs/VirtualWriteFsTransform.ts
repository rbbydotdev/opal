import { CommonFileSystem } from "@/data/fs/FileSystemTypes";

export function VirtualWriteFsTransform(fs: CommonFileSystem): CommonFileSystem {
  const virtualWrites = new Map<string, Uint8Array | Buffer | string>();

  return new Proxy(fs, {
    get(target, prop) {
      if (prop === "writeFile") {
        return (path: string, data: Uint8Array | Buffer | string, options?: { encoding?: "utf8"; mode: number }) => {
          virtualWrites.set(path, data);
          return Promise.resolve();
        };
      }

      if (prop === "readFile") {
        return async (path: string, options?: { encoding?: "utf8" }) => {
          if (virtualWrites.has(path)) {
            return virtualWrites.get(path)!;
          }
          return target.readFile(path, options);
        };
      }

      return target[prop as keyof CommonFileSystem];
    },
  });
}

// class VirtualWriteTranslateFs extends TranslateFsClass {
//   private writeMap: Map<AbsPath, Uint8Array | Buffer | string> = new Map();

//   constructor(fs: CommonFileSystem, translate: AbsPath | string | ((path: AbsPath | string) => AbsPath | string)) {
//     super(fs, translate);
//   }

//   async writeFile(
//     path: string,
//     data: Uint8Array | Buffer | string,
//     options?: { encoding?: "utf8"; mode: number }
//   ): Promise<void> {
//     return this.fs.writeFile(path, data, options);
//   }
//   async readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string> {
//     const translatedPath =
//       typeof this.translate === "function" ? this.translate(path) : joinPath(absPath(this.translate), path);
//     if (this.writeMap.has(translatedPath)) {
//       return this.writeMap.get(absPath(translatedPath))!;
//     }
//     return this.fs.readFile(path, options);
//   }
// }
