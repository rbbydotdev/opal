declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { [brand]: B };

export type AbsolutePath2 = Brand<string, "AbsolutePath">;
export type RelativePath2 = Brand<string, "RelativePath">;

import { isImageType } from "@/lib/fileType";
import pathModule from "path";
import { getMimeType } from "./mimeType";

// --- Constructors ---
export function absPath2(path: string): AbsolutePath2 {
  if (!path.startsWith("/")) path = "/" + path;
  if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
  return path as AbsolutePath2;
}

export function relPath2(path: string): RelativePath2 {
  if (path.startsWith("/")) path = path.slice(1);
  if (path !== "" && path.endsWith("/")) path = path.slice(0, -1);
  return path as RelativePath2;
}

// --- Path Utilities ---
export function extname(path: AbsolutePath2 | RelativePath2): string {
  return pathModule.extname(basename(path));
}

export function prefix(path: AbsolutePath2 | RelativePath2): string {
  const ext = extname(path);
  const base = basename(path);
  return ext.length ? base.slice(0, base.length - ext.length) : base;
}

export function basename(path: AbsolutePath2 | RelativePath2): string {
  return pathModule.basename(path as string);
}

export function dirname(path: AbsolutePath2 | RelativePath2): string {
  return pathModule.dirname(path as string);
}

export function equals(
  a: AbsolutePath2 | RelativePath2 | null | undefined,
  b: AbsolutePath2 | RelativePath2 | null | undefined
): boolean {
  if (!a || !b) return false;
  return (a as string) === (b as string);
}

// --- Encoding/Decoding ---
export function encodePath(path: AbsolutePath2 | RelativePath2 | string): string {
  return (path as string)
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

export function decodePath(path: AbsolutePath2 | RelativePath2 | string): string {
  return (path as string)
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
export function joinAbsolutePath(base: AbsolutePath2, ...parts: (string | RelativePath2)[]): AbsolutePath2 {
  const joined = [base as string, ...parts.map(p => p as string)].join("/");
  return absPath2(joined);
}

export function joinRelativePath2(base: RelativePath2, ...parts: (string | RelativePath2)[]): RelativePath2 {
  const joined = [base as string, ...parts.map(p => p as string)].join("/");
  return relPath2(joined);
}

// --- Shift ---
export function shiftAbsolutePath(path: AbsolutePath2): AbsolutePath2 {
  const segments = (path as string).split("/");
  segments.shift();
  segments[0] = "";
  return absPath2(segments.join("/"));
}

export function shiftRelativePath2(path: RelativePath2): RelativePath2 {
  const segments = (path as string).split("/");
  segments.shift();
  return relPath2(segments.join("/"));
}

// --- Increment Path ---
export function incPath<T extends AbsolutePath2 | RelativePath2>(path: T): T {
  const regex = /^(.*?)(\d*)(\.[^.]*$|$)/;
  const match = (path as string).match(regex);

  let newPath: string;
  if (match) {
    const [, prefix, number, suffix] = match;
    const incrementedNumber = number ? parseInt(number, 10) + 1 : 1;
    newPath = `${prefix}${incrementedNumber}${suffix}`;
  } else {
    newPath = `${path as string}-1`;
  }
  return ((path as string).startsWith("/") ? absPath2(newPath) : relPath2(newPath)) as T;
}

// --- Depth ---
export function depth(path: AbsolutePath2): number {
  return (path as string).split("/").length - 2;
}

// --- Change Prefix ---
export function changePrefixAbs(path: AbsolutePath2, newPrefix: string): AbsolutePath2 {
  const ext = extname(path);
  const dir = dirname(path);
  if (!ext) return absPath2(pathModule.join(dir, newPrefix));
  return absPath2(pathModule.join(dir, `${newPrefix}${ext}`));
}

export function changePrefixRel(path: RelativePath2, newPrefix: string): RelativePath2 {
  const ext = extname(path);
  const dir = dirname(path);
  if (!ext) return relPath2(pathModule.join(dir, newPrefix));
  return relPath2(pathModule.join(dir, `${newPrefix}${ext}`));
}

// --- MIME and Image ---
export function getPathMimeType(path: AbsolutePath2 | RelativePath2): string {
  return getMimeType(path as string);
}

export function isImage(path: AbsolutePath2 | RelativePath2): boolean {
  return isImageType(getPathMimeType(path));
}

// --- Ancestor/Lineage Utilities ---
export function isAncestor(path: AbsolutePath2 | string | null, root: AbsolutePath2 | string | null): boolean {
  if (path === root) return true;
  if (path === null || root === null) return false;
  const rootSegments = (root as string).split("/");
  const pathSegments = (path as string).split("/");
  return pathSegments.slice(0, rootSegments.length).every((segment, i) => segment === rootSegments[i]);
}

export function replaceAncestor(
  root: AbsolutePath2 | string,
  oldPath: AbsolutePath2 | string,
  newPath: AbsolutePath2 | string
): AbsolutePath2 | string {
  if (oldPath === root) return newPath;
  if (oldPath === null || root === null) return oldPath;
  const rootSegments = (root as string).split("/");
  const pathSegments = (oldPath as string).split("/");
  if (pathSegments.slice(0, rootSegments.length).every((segment, i) => segment === rootSegments[i])) {
    return joinAbsolutePath(absPath2(newPath as string), ...pathSegments.slice(rootSegments.length));
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
