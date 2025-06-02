declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { [brand]: B };

export type AbsPath = Brand<string, "AbsolutePath">;
export type RelPath = Brand<string, "RelativePath">;

import { isImageType } from "@/lib/fileType";
import pathModule from "path";
import { getMimeType } from "./mimeType";

// --- Constructors ---
export function absPath(path: string): AbsPath {
  if (!path.startsWith("/")) path = "/" + path;
  if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
  return path as AbsPath;
}

export function relPath(path: string): RelPath {
  if (path.startsWith("/")) path = path.slice(1);
  if (path !== "" && path.endsWith("/")) path = path.slice(0, -1);
  return path as RelPath;
}

export function isAbsPath(path: AbsPath | RelPath): path is AbsPath {
  return typeof path === "string" && path.startsWith("/");
}
export function isRelPath(path: AbsPath | RelPath): path is RelPath {
  return typeof path === "string" && !path.startsWith("/");
}

// --- Path Utilities ---
export function extname(path: AbsPath | RelPath): string {
  return pathModule.extname(basename(path));
}

export function prefix(path: AbsPath | RelPath): string {
  const ext = extname(path);
  const base = basename(path);
  return ext.length ? base.slice(0, base.length - ext.length) : base;
}

export function basename(path: AbsPath | RelPath): string {
  return pathModule.basename(path);
}

export function dirname(path: AbsPath | RelPath): string {
  return pathModule.dirname(path);
}

export function equals(a: AbsPath | RelPath | null | undefined, b: AbsPath | RelPath | null | undefined): boolean {
  if (!a || !b) return false;
  return a === b;
}

// --- Encoding/Decoding ---
export function encodePath(path: AbsPath | RelPath | string): string {
  return path
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
  if (!base.startsWith("/")) {
    const joined = [base, ...parts.map(relPath)].join("/");
    return relPath(joined) as T;
  }
  const joined = [base === "/" ? "" : base, ...parts.map(relPath)].join("/");
  return absPath(joined) as T;
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

// --- Increment Path ---
export function incPath<T extends AbsPath | RelPath>(path: T): T {
  const regex = /^(.*?)(\d*)(\.[^.]*$|$)/;
  const match = path.match(regex);

  let newPath: string;
  if (match) {
    const [, prefix, number, suffix] = match;
    const incrementedNumber = number ? parseInt(number, 10) + 1 : 1;
    newPath = `${prefix}${incrementedNumber}${suffix}`;
  } else {
    newPath = `${path}-1`;
  }
  return (path.startsWith("/") ? absPath(newPath) : relPath(newPath)) as T;
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

export function isImage(path: AbsPath | RelPath): boolean {
  return isImageType(getPathMimeType(path));
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
      if (isAncestor(b.toString(), a.toString())) range.splice(j--, 1);
    }
  }
  return range;
}
