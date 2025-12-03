import { SpecialDirsPaths } from "@/data/SpecialDirsPaths";
import type { TreeNode } from "@/lib/FileTree/TreeNode";
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

// Fluent filter builder
export class Filter {
  constructor(private predicate: (path: AbsPath | TreeNode) => boolean) {}

  static only(...dirs: AbsPath[]) {
    return new Filter((path) => FilterDirs(path, dirs));
  }

  static except(...dirs: AbsPath[]) {
    return new Filter((path) => !FilterDirs(path, dirs));
  }

  static all() {
    return new Filter(() => true);
  }

  static none() {
    return new Filter(() => false);
  }

  and(other: Filter) {
    return new Filter((path) => this.predicate(path) && other.predicate(path));
  }

  or(other: Filter) {
    return new Filter((path) => this.predicate(path) || other.predicate(path));
  }

  not() {
    return new Filter((path) => !this.predicate(path));
  }

  // Getter that returns a bound function - preserves this context
  get $() {
    return (path: AbsPath | TreeNode) => this.predicate(path);
  }
}

// Usage examples:
// Filter.only(SpecialDirs.Build).$
// Filter.except(SpecialDirs.Git, SpecialDirs.Trash).$
// Filter.only(SpecialDirs.Build).or(Filter.only(SpecialDirs.Storage)).$
// Filter.all().except(SpecialDirs.Git).and(Filter.only(SpecialDirs.Build)).$
// Filter.except(SpecialDirs.Git).not().$

// const BuildIgnoreDirs = [
//   relPath("node_modules"),
//   relPath(".vscode"),
//   relPath(".next"),
//   relPath("build"),
//   relPath("dist"),
//   relPath("coverage"),
//   relPath(".cache"),
//   relPath(".env"),
//   relPath(".vercel"),
//   relPath("playwright-report"),
//   relPath(".tanstack"),
//   relPath(".github"),
//   relPath(".DS_Store"),
//   relPath("*.log"),
// ];
