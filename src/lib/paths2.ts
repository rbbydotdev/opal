export type AbsPath = Brand<string, "AbsolutePath">;
export type RelPath = Brand<string, "RelativePath">;

// import { TreeNode } from "@/components/filetree/TreeNode";
import { isImageType, StringMimeTypes } from "@/lib/fileType";
import pathModule from "path";
import { isMarkdownType } from "./fileType";
import { getMimeType } from "./mimeType";

// --- Constructors ---
export function absPath(path: string | { toString(): string; type: "dir" | "file"; path: AbsPath }): AbsPath {
  let pathStr = String(path);
  if (isAbsPath(pathStr)) return pathModule.normalize(pathStr) as AbsPath;
  if (!pathStr.startsWith("/")) pathStr = "/" + pathStr;
  if (pathStr !== "/" && pathStr.endsWith("/")) pathStr = pathStr.slice(0, -1);
  return pathModule.normalize(pathStr) as AbsPath;
}

export function relPath(path: string | { toString(): string; type: "dir" | "file"; path: AbsPath }): RelPath {
  let pathStr = String(path);
  if (pathStr.startsWith("/")) pathStr = pathModule.normalize(pathStr).slice(1);
  if (pathStr !== "" && pathStr.endsWith("/")) pathStr = pathStr.slice(0, -1);
  return pathModule.normalize(pathStr) as RelPath;
}

export function isAbsPath(path: AbsPath | RelPath | string): path is AbsPath {
  return typeof path === "string" && path.startsWith("/");
}
function isRelPath(path: AbsPath | RelPath | string): path is RelPath {
  return typeof path === "string" && !path.startsWith("/");
}

// --- Path Utilities ---
export function extname(path: AbsPath | RelPath | string | { toString(): string }): string {
  return pathModule.extname(String(path));
}

export function prefix(path: AbsPath | RelPath | string | { toString(): string }): string {
  const ext = extname(path);
  const base = basename(path);
  return ext.length ? base.slice(0, base.length - ext.length) : base;
}

export function basename(path: AbsPath | RelPath | string | { toString(): string }): RelPath {
  return relPath(pathModule.basename(String(path)));
}

export function dirname(path: AbsPath | RelPath | string | { toString(): string }): AbsPath {
  return absPath(pathModule.dirname(String(path)));
}

export function equals(a: AbsPath | RelPath | null | undefined, b: AbsPath | RelPath | null | undefined): boolean {
  if (!a || !b) return false;
  return a === b;
}

// --- Encoding/Decoding ---
function isEncoded(str: string): boolean {
  return /%[0-9A-Fa-f]{2}/.test(str);
}

export function encodePath<T extends string | { toString(): string } | AbsPath>(path: T): T {
  return String(path)
    .split("/")
    .map((part) => (isEncoded(part) ? part : encodeURIComponent(part)))
    .join("/") as T;
}

export function decodePath<T extends string | { toString(): string } | AbsPath>(path: T): T {
  return String(path)
    .split("/")
    .map((part) => (isEncoded(part) ? decodeURIComponent(part) : part))
    .join("/") as T;
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
function changePrefixAbs(path: AbsPath, newPrefix: string): AbsPath {
  const ext = extname(path);
  const dir = dirname(path);
  if (!ext) return absPath(pathModule.join(dir, newPrefix));
  return absPath(pathModule.join(dir, `${newPrefix}${ext}`));
}

function changePrefix(path: AbsPath | RelPath, newPrefix: string): RelPath | AbsPath {
  if (isAbsPath(path)) return changePrefixAbs(path, newPrefix);
  if (isRelPath(path)) return changePrefixRel(path, newPrefix);
  else {
    throw new Error("Invalid path type. Expected AbsPath or RelPath.");
  }
}

function changePrefixRel(path: RelPath, newPrefix: string): RelPath {
  const ext = extname(path);
  const dir = dirname(path);
  if (!ext) return relPath(pathModule.join(dir, newPrefix));
  return relPath(pathModule.join(dir, `${newPrefix}${ext}`));
}

export function isImage(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return isImageType(getMimeType(relPath(String(path))));
}

export function isMarkdown(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return isMarkdownType(getMimeType(relPath(String(path))));
}
export function isText(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return getMimeType(relPath(String(path))).startsWith("text/");
}

export function isEjs(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return getMimeType(relPath(String(path))) === "text/x-ejs";
}

export const templateMimeTypes = ["text/x-ejs", "text/x-mustache", "text/html"] as const;

export type TemplateType = (typeof templateMimeTypes)[number];

export const isTemplateType = (type: string): type is TemplateType => {
  return templateMimeTypes.includes(type);
};
export function isTemplateFile(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return isEjs(path) || isMustache(path);
}
export function isMustache(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return getMimeType(relPath(String(path))) === "text/x-mustache";
}
export function isHtml(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return getMimeType(relPath(String(path))) === "text/html";
}
export function isCss(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return getMimeType(relPath(String(path))) === "text/css";
}
export function isBin(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return getMimeType(relPath(String(path))) === "application/octet-stream";
}
export function isSourceOnly(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return isText(path) && !isMarkdown(path);
}
export function isPreviewable(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  return isMarkdown(path) || isTemplateFile(path) || isHtml(path);
}
export function isStringish(path: AbsPath | RelPath | string | { toString(): string }): boolean {
  const mimeType = getMimeType(relPath(String(path)));
  return StringMimeTypes.includes(mimeType);
}

// --- Ancestor/Lineage Utilities ---
export function isAncestor({
  child: child,
  parent: parent,
}: {
  child: AbsPath | string | null;
  parent: AbsPath | string | null;
}): boolean {
  if (child === parent) return true; // false?
  if (child === null || parent === null) return false;
  const rootSegments = parent.split("/");
  const pathSegments = child.split("/");
  return pathSegments.slice(0, rootSegments.length).every((segment, i) => segment === rootSegments[i]);
}

export function reduceLineage<T extends string | { toString(): string }>(range: Array<T>) {
  type nodeType = Record<string, unknown> & Record<symbol, T>;
  const $end = Symbol();
  const tree = {
    root: {},
  };
  for (const path of range) {
    let node: nodeType = tree.root;
    for (const segment of path.toString().split("/").slice(0)) {
      node = node[segment] = (node[segment] as nodeType) ?? ({} as nodeType);
    }
    node[$end] = path;
  }
  const results: Array<T> = [];
  for (const queue: nodeType[] = [tree.root]; queue.length; ) {
    const node = queue.pop()!;
    if (typeof node[$end] !== "undefined") {
      results.push(node[$end]);
    } else {
      queue.push(...(Object.values(node) as nodeType[]));
    }
  }
  return results;
}

export function strictPathname(str: string): string {
  // Replace any character that is not a-z, A-Z, 0-9, _, -, /, or . with "_"
  let sanitized = str
    .trim()
    .toString()
    .replace(/[^a-zA-Z0-9_\-\/\ ]/g, "_");
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

export function strictPrefix(path: string): string {
  return strictPathname(prefix(basename(path.trim())).replace(/\//g, "_"));
}

export function newFileName(fullPath: string, fileName: string): RelPath {
  return basename(changePrefix(fullPath.trim() as AbsPath, strictPathname(prefix(fileName.trim()))));
}
export const stringifyEntry = (
  entry:
    | string
    | Buffer<ArrayBufferLike>
    | { name: string | Buffer<ArrayBufferLike>; isDirectory: () => boolean; isFile: () => boolean }
) => {
  if (typeof entry === "object" && entry !== null && "name" in entry) {
    return String(entry.name);
  } else if (typeof entry === "string") {
    return entry;
  } else if (entry instanceof Buffer) {
    return entry.toString();
  }
  return String(entry);
};
// GithubVarer{
//    device_code: "3584d83530557fdd1f46af8289938c8ef79f9dc5",
//    user_code: "WDJB-MJHT",
//    verification_uri: "https://github.com/login/device",
//    expires_in: 900,
//    interval: 5,
//  };
// corsProxy,
// clientId: NotEnv.PublicGithubClientID,
export const stripTrailingSlash = (path: string): string => {
  return path.endsWith("/") ? path.slice(0, -1) : path;
};

export const stripLeadingSlash = (path: string): string => {
  return path.startsWith("/") ? path.slice(1) : path;
};

export const addTrailingSlash = (path: string): string => {
  return path.endsWith("/") ? path : path + "/";
};
export function allowedFiletreePathMove(
  targetPath: AbsPath,
  node: { path: AbsPath; toString(): string } | AbsPath
): boolean {
  // Prevent moving node to its current directory (no-op)
  if (dirname(node) === targetPath) {
    // No-op: trying to move node to its current directory
    return false;
  }
  // Prevent moving node into itself
  if (node.toString() === targetPath) {
    // Invalid move: trying to move node into itself
    return false;
  }
  if (targetPath.startsWith(node + "/")) {
    // Invalid move: trying to move node into its own descendant
    return false;
  }
  return true;
}

export function dropPath(targetPath: AbsPath, node: { path: AbsPath }) {
  return joinPath(targetPath, basename(node.path));
}
