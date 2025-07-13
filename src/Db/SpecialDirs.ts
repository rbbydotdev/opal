import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath } from "@/lib/paths2";

export const SpecialDirs = {
  Trash: absPath("/.trash"),
  Storage: absPath("/.storage"),
  Git: absPath("/.git"),
  get All() {
    return [this.Trash, this.Storage, this.Git];
  },
} as const;

export function FilterOutSpecialDirs(path: AbsPath | TreeNode): boolean {
  return !SpecialDirs.All.some((dir) => String(path).startsWith(dir));
}
