import { CommonFileSystem } from "@/data/FileSystemTypes";
import { FileTree } from "@/lib/FileTree/Filetree";
import { Mutex } from "async-mutex";

export abstract class DiskContext {
  constructor(
    public fs: CommonFileSystem,
    public fileTree: FileTree,
    public mutex: Mutex
  ) {}

  abstract tearDown(): Promise<void>;
}
