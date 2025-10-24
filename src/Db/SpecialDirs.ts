import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath, relPath } from "@/lib/paths2";

const paths = {
  Trash: absPath("/.trash"),
  Storage: absPath("/.storage"),
  Git: absPath("/.git"),
  Thumb: absPath("/.thumb"),
  Build: absPath("/.build"),
};
export const SpecialDirs = {
  ...paths,
  allSpecialDirsExcept(...paths: (AbsPath | TreeNode)[]): AbsPath[] {
    return this.All.filter((dir) => !paths.some((path) => String(path) === dir || String(path).startsWith(dir + "/")));
  },
  get All() {
    return Object.values(paths);
  },
} as const;

export function FilterOutSpecialDirs(path: AbsPath | TreeNode): boolean {
  return !SpecialDirs.All.some((dir) => String(path) === dir || String(path).startsWith(dir + "/"));
}
export function FilterInSpecialDirs(path: AbsPath | TreeNode): boolean {
  return SpecialDirs.All.some((dir) => String(path) === dir || String(path).startsWith(dir + "/"));
}

const BuildIgnoreDirs = [
  relPath("node_modules"),
  relPath(".vscode"),
  relPath(".next"),
  relPath("build"),
  relPath("dist"),
  relPath("coverage"),
  relPath(".cache"),
  relPath(".env"),
  relPath(".vercel"),
  relPath("playwright-report"),
  relPath(".tanstack"),
  relPath(".github"),
  relPath(".DS_Store"),
  relPath("*.log"),
];
