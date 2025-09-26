import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath } from "@/lib/paths2";

export const SpecialDirs = {
  Trash: absPath("/.trash"),
  Storage: absPath("/.storage"),
  Git: absPath("/.git"),

  allSpecialDirsExcept(...paths: (AbsPath | TreeNode)[]): AbsPath[] {
    return this.All.filter((dir) => !paths.some((path) => String(path) === dir || String(path).startsWith(dir + "/")));
  },
  get All() {
    return [this.Trash, this.Storage, this.Git];
  },
} as const;

export function FilterOutSpecialDirs(path: AbsPath | TreeNode): boolean {
  return !SpecialDirs.All.some((dir) => String(path) === dir || String(path).startsWith(dir + "/"));
}
export function FilterInSpecialDirs(path: AbsPath | TreeNode): boolean {
  return SpecialDirs.All.some((dir) => String(path) === dir || String(path).startsWith(dir + "/"));
}
