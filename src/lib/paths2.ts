declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { [brand]: B };

export type AbsPath = Brand<string, "AbsolutePath">;
export type RelPath = Brand<string, "RelativePath">;

import { TreeNode } from "@/lib/FileTree/TreeNode";
import { isImageType } from "@/lib/fileType";
import pathModule from "path";
import { isMarkdownType } from "./fileType";
import { getMimeType } from "./mimeType";

// --- Constructors ---
export function absPath(path: string | TreeNode): AbsPath {
  let pathStr = String(path);
  if (isAbsPath(pathStr)) return pathModule.normalize(pathStr) as AbsPath;
  if (!pathStr.startsWith("/")) pathStr = "/" + pathStr;
  if (pathStr !== "/" && pathStr.endsWith("/")) pathStr = pathStr.slice(0, -1);
  return pathModule.normalize(pathStr) as AbsPath;
}

export function relPath(path: string | TreeNode): RelPath {
  let pathStr = String(path);
  if (pathStr.startsWith("/")) pathStr = pathModule.normalize(pathStr).slice(1);
  if (pathStr !== "" && pathStr.endsWith("/")) pathStr = pathStr.slice(0, -1);
  return pathModule.normalize(pathStr) as RelPath;
}

export function isAbsPath(path: AbsPath | RelPath | string): path is AbsPath {
  return typeof path === "string" && path.startsWith("/");
}
export function isRelPath(path: AbsPath | RelPath | string): path is RelPath {
  return typeof path === "string" && !path.startsWith("/");
}

// --- Path Utilities ---
export function extname(path: AbsPath | RelPath | TreeNode | string): string {
  return pathModule.extname(basename(String(path)));
}

export function prefix(path: AbsPath | RelPath | TreeNode | string): string {
  const ext = extname(path);
  const base = basename(path);
  return ext.length ? base.slice(0, base.length - ext.length) : base;
}

export function basename(path: AbsPath | RelPath | TreeNode | string): RelPath {
  return relPath(pathModule.basename(String(path)));
}

export function dirname(path: AbsPath | RelPath | TreeNode | string): AbsPath {
  return absPath(pathModule.dirname(String(path)));
}

export function equals(a: AbsPath | RelPath | null | undefined, b: AbsPath | RelPath | null | undefined): boolean {
  if (!a || !b) return false;
  return a === b;
}

// --- Encoding/Decoding ---
export function encodePath(path: AbsPath | RelPath | TreeNode | string): string {
  return String(path)
    .split("/")
    .map((part) => {
      try {
        return part !== decodeURIComponent(part) ? part : encodeURIComponent(part);
      } catch {
        return encodeURIComponent(part);
      }
    })
    .join("/");
}

export function decodePath(path: AbsPath | RelPath | string): string {
  return path
    .split("/")
    .map((part) => {
      try {
        return part === decodeURIComponent(part) ? part : decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("/");
}

// --- Join ---
export function joinPath<T extends AbsPath | RelPath>(base: T, ...parts: (string | RelPath)[]): T {
  // if (isRelPath(base)) {
  if (!base.startsWith("/")) {
    const joined = [base, ...parts.map(relPath)].join("/");
    return relPath(joined) as T;
  }
  const joined = [base === "/" ? "" : base, ...parts.map(relPath)].join("/");
  return absPath(pathModule.normalize(joined)) as T;
}

// --- Shift ---
export function shiftAbsolutePath(path: AbsPath): AbsPath {
  const segments = path.split("/");
  segments.shift();
  segments[0] = "";
  return absPath(segments.join("/"));
}

export function shiftRelativePath2(path: RelPath): RelPath {
  const segments = path.split("/");
  segments.shift();
  return relPath(segments.join("/"));
}

export function duplicatePath(path: AbsPath) {
  return changePrefix(path, prefix(path) + "-duplicate");
}
// --- Increment Path ---

export function incPath<T extends AbsPath | RelPath>(path: T): T {
  // Split path into directory and filename
  const dir = dirname(path);
  const ext = extname(path);
  const pre = prefix(path);

  if (/\d+$/.test(pre)) {
    //capture and parse digits
    const match = pre.match(/\d+$/);
    const digits = match ? parseInt(match[0], 10) : 0;
    const newPre = pre.replace(/\d+$/, "") + (digits + 1);
    return (isAbsPath(path) ? absPath(`${dir}/${newPre}${ext}`) : relPath(`${dir}/${newPre}${ext}`)) as T;
  } else {
    // If no digits at the end, append "-1" or "-1.ext"
    const newPre = pre + "-1";
    if (ext) {
      return (isAbsPath(path) ? absPath(`${dir}/${newPre}${ext}`) : relPath(`${dir}/${newPre}${ext}`)) as T;
    }
    return (isAbsPath(path) ? absPath(`${dir}/${newPre}`) : relPath(`${dir}/${newPre}`)) as T;
  }
}

// --- Depth ---
export function depth(path: AbsPath): number {
  return path.split("/").length - 2;
}

// --- Change Prefix ---
export function changePrefixAbs(path: AbsPath, newPrefix: string): AbsPath {
  const ext = extname(path);
  const dir = dirname(path);
  if (!ext) return absPath(pathModule.join(dir, newPrefix));
  return absPath(pathModule.join(dir, `${newPrefix}${ext}`));
}

export function changePrefix(path: AbsPath | RelPath, newPrefix: string): RelPath | AbsPath {
  if (isAbsPath(path)) return changePrefixAbs(path, newPrefix);
  if (isRelPath(path)) return changePrefixRel(path, newPrefix);
  else {
    throw new Error("Invalid path type. Expected AbsPath or RelPath.");
  }
}

export function changePrefixRel(path: RelPath, newPrefix: string): RelPath {
  const ext = extname(path);
  const dir = dirname(path);
  if (!ext) return relPath(pathModule.join(dir, newPrefix));
  return relPath(pathModule.join(dir, `${newPrefix}${ext}`));
}

// --- MIME and Image ---
export function getPathMimeType(path: AbsPath | RelPath): string {
  return getMimeType(path);
}

export function isImage(path: AbsPath | RelPath | TreeNode | string): boolean {
  return isImageType(getPathMimeType(relPath(String(path))));
}

export function isMarkdown(path: AbsPath | RelPath | TreeNode | string): boolean {
  return isMarkdownType(getPathMimeType(relPath(String(path))));
}

// --- Ancestor/Lineage Utilities ---
export function isAncestor(path: AbsPath | string | null, root: AbsPath | string | null): boolean {
  if (path === root) return true;
  if (path === null || root === null) return false;
  const rootSegments = root.split("/");
  const pathSegments = path.split("/");
  return pathSegments.slice(0, rootSegments.length).every((segment, i) => segment === rootSegments[i]);
}

export function replaceAncestor(
  root: AbsPath | string,
  oldPath: AbsPath | string,
  newPath: AbsPath | string
): AbsPath | string {
  if (oldPath === root) return newPath;
  if (oldPath === null || root === null) return oldPath;
  const rootSegments = root.split("/");
  const pathSegments = oldPath.split("/");
  if (pathSegments.slice(0, rootSegments.length).every((segment, i) => segment === rootSegments[i])) {
    return joinPath(absPath(newPath), ...pathSegments.slice(rootSegments.length));
  }
  return oldPath;
}

// --- Reduce Lineage ---
export function reduceLineage<T extends (string | { toString(): string })[]>(range: T): T {
  [...range].sort((a, b) => a.toString().length - b.toString().length);
  for (let i = 0; i < range.length; i++) {
    const a = range[i];
    for (let j = i + 1; j < range.length; j++) {
      const b = range[j];
      if (isAncestor(b!.toString(), a!.toString())) range.splice(j--, 1);
    }
  }
  return range;
}

export function sanitizeUserInputFilePath(str: string): string {
  let sanitized = str.toString().replace(/[^a-zA-Z0-9_\-\/\.]/g, "_");
  // Prevent path from starting with a dot
  sanitized = sanitized.replace(/^\.*/, "");
  // path cannot contain slashes
  sanitized = sanitized.replace(/\/+/g, "/");
  return relPath(sanitized);
}

//removes the root path from the given path
export function resolveFromRoot(rootPath: AbsPath, path: AbsPath): AbsPath;
export function resolveFromRoot(rootPath: RelPath, path: RelPath): RelPath;
export function resolveFromRoot(rootPath: AbsPath | RelPath, path: AbsPath | RelPath): AbsPath | RelPath {
  if (isAbsPath(path) && isAbsPath(rootPath)) {
    return relPath(pathModule.relative(rootPath, path));
  }
  if (isRelPath(path) && isRelPath(rootPath)) {
    return relPath(pathModule.relative(rootPath, path));
  }
  throw new Error("Both paths must be of the same type (AbsPath or RelPath).");
}

export function absPathname(path: string) {
  //in the case we get a url then just get the path from the url parse
  //other wise just return the string
  //we can be faster by first looking for http
  if (!path.startsWith("http")) {
    return absPath(path);
  }
  try {
    const url = new URL(path);
    return absPath(url.pathname);
  } catch (_e) {
    return absPath(path);
  }
}
