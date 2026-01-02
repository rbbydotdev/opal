import type { TreeNode } from "@/components/filetree/TreeNode";
import { SpecialDirsPaths } from "@/data/SpecialDirsPaths";
import { AbsPath } from "@/lib/paths2";

export const SpecialDirs = {
  ...SpecialDirsPaths,
  allInSpecialDirsExcept(...paths: (AbsPath | TreeNode)[]): AbsPath[] {
    return this.All.filter((dir) => !paths.some((path) => String(path) === dir || String(path).startsWith(dir + "/")));
  },
  allOutSpecialDirsExcept(...paths: (AbsPath | TreeNode)[]): AbsPath[] {
    return this.All.filter((dir) => paths.some((path) => String(path) === dir || String(path).startsWith(dir + "/")));
  },
  get All() {
    return Object.values(SpecialDirsPaths);
  },
} as const;

export function FilterOutSpecialDirs(path: AbsPath | TreeNode): boolean {
  return !SpecialDirs.All.some((dir) => String(path) === dir || String(path).startsWith(dir + "/"));
}
export function FilterInSpecialDirs(path: AbsPath | TreeNode): boolean {
  return SpecialDirs.All.some((dir) => String(path) === dir || String(path).startsWith(dir + "/"));
}
function FilterDirs(path: AbsPath | TreeNode, dirs: AbsPath[]): boolean {
  return dirs.some((dir) => String(path) === dir || String(path).startsWith(dir + "/"));
}

// The core functional filter builder
export const Filter = (() => {
  type Predicate = (path: AbsPath | TreeNode) => boolean;

  const make = (predicate: Predicate) => {
    const fn = (path: AbsPath | TreeNode) => predicate(path);

    // Compose filters
    fn.and = (other: ReturnType<typeof make>) => make((path) => predicate(path) && other(path));

    fn.or = (other: ReturnType<typeof make>) => make((path) => predicate(path) || other(path));

    fn.not = () => make((path) => !predicate(path));

    return fn;
  };

  make.only = (...dirs: AbsPath[]) => make((path) => FilterDirs(path, dirs));
  make.except = (...dirs: AbsPath[]) => make((path) => !FilterDirs(path, dirs));
  make.all = () => make(() => true);
  make.none = () => make(() => false);

  return make;
})();
