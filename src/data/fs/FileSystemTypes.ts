export interface CommonFileSystem {
  readdir(path: string): Promise<
    (
      | string
      | Buffer<ArrayBufferLike>
      | {
          name: string | Buffer<ArrayBufferLike>;
          isDirectory: () => boolean;
          isFile: () => boolean;
        }
    )[]
  >;
  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>; // Exact type can vary based on implementation details.
  readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string>;
  mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
  writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void>;

  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  lstat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>; // Similar to stat, but for symbolic links

  symlink(target: string, path: string): Promise<void>;

  readlink(path: string): Promise<Buffer<ArrayBufferLike> | string | null>;
}

// Helper function for recursive directory creation
export async function mkdirRecursive(this: CommonFileSystem, filePath: string): Promise<string | void> {
  const segments = filePath.split("/").filter((s) => s !== "");
  for (let i = 1; i <= segments.length; i++) {
    const dirPath = "/" + segments.slice(0, i).join("/");
    try {
      await this.mkdir(dirPath, { recursive: true, mode: 0o777 });
    } catch (err: any) {
      if (err?.code !== "EEXIST") {
        console.error(`Error creating directory ${dirPath}:`, err);
      }
    }
  }
  return filePath;
}

export const NullFileSystem: CommonFileSystem = {
  readdir: async (_path: string) => {
    return [];
  },
  stat: async (_path: string) => {
    return {
      isDirectory: () => false,
      isFile: () => false,
    };
  },
  readFile: async (_path: string, _options?: { encoding?: "utf8" }) => {
    return new Uint8Array();
  },
  mkdir: async (_path: string, _options?: { recursive?: boolean; mode: number }) => {
    return;
  },
  rename: async (_oldPath: string, _newPath: string) => {
    return;
  },
  unlink: async (_path: string) => {
    return;
  },
  writeFile: async (
    _path: string,
    _data: Uint8Array | Buffer | string,
    _options?: { encoding?: "utf8"; mode: number }
  ) => {
    return;
  },
  rmdir: async (_path: string, _options?: { recursive?: boolean }) => {
    return;
  },
  lstat: async (_path: string) => {
    return {
      isDirectory: () => false,
      isFile: () => false,
    };
  },
  symlink: async (_target: string, _path: string) => {
    return;
  },
  readlink: async (_path: string) => {
    return null;
  },
};
