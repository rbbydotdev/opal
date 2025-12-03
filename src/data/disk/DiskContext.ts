import { FileTree } from "@/components/sidebar/FileTree/Filetree";
import { CommonFileSystem } from "@/data/fs/FileSystemTypes";
import { Mutex } from "async-mutex";

export abstract class DiskContext {
  constructor(
    public fs: CommonFileSystem,
    public fileTree: FileTree,
    public mutex: Mutex
  ) {}

  abstract tearDown(): Promise<void>;
}
