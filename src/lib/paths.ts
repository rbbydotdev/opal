import { TreeNode } from "@/lib/FileTree/TreeNode";
import { isImageType } from "@/lib/fileType";
import path from "path";
import { getMimeType } from "./mimeType";

export class BasePath extends String {
  constructor(private filePath: string) {
    super(filePath);
    this.path = filePath;
  }

  protected path: string;

  get str() {
    return this.toString();
  }

  extname() {
    return path.extname(this.basename().str);
  }

  prefix() {
    const ext = this.extname();
    return ext.length ? this.basename().slice(0, this.basename().length - ext.length) : this.basename();
  }

  toString() {
    return this.filePath;
  }
  toJSON() {
    return this.str;
  }

  equals(p?: BasePath | null) {
    if (!p) return false;
    return this.str === p.str;
  }

  valueOf(): string {
    return this.str;
  }
  encode() {
    return BasePath.encode(this);
  }
  decode() {
    return BasePath.decode(this);
  }
  urlSafe() {
    return this.encode();
  }
  getMimeType() {
    return getMimeType(String(this));
  }
  isImage() {
    return isImageType(this.getMimeType());
  }

  static encode(path: BasePath | string) {
    return path
      .split("/")
      .map((part) => {
        try {
          // Check if the part is already encoded
          return part !== decodeURIComponent(part) ? part : encodeURIComponent(part);
        } catch (_e) {
          // If decoding throws an error, it means the string is not properly encoded
          return encodeURIComponent(part);
        }
      })
      .join("/");
  }
  static decode(path: BasePath | string) {
    return path
      .split("/")
      .map((part) => {
        try {
          // Check if the part is already decoded
          return part === decodeURIComponent(part) ? part : decodeURIComponent(part);
        } catch (_e) {
          // If decoding throws an error, it means the string is not properly encoded
          return part;
        }
      })
      .join("/");
  }

  basename() {
    return new RelPath(path.basename(this.path));
  }

  inc() {
    const regex = /^(.*?)(\d*)(\.[^.]*$|$)/;
    const match = this.toString().match(regex);

    if (match) {
      const [, prefix, number, suffix] = match;
      const incrementedNumber = number ? parseInt(number, 10) + 1 : 1;
      return new BasePath(`${prefix}${incrementedNumber}${suffix}`);
    } else {
      return new BasePath(`${this.toString()}-1`);
    }
  }
}
export class AbsPath extends BasePath {
  // Use the unique symbol as a brand
  //@ts-ig_nore
  // private [AbsPathBrand]: void;

  public readonly path: string;

  static New(path: string) {
    return new AbsPath(path);
  }
  join(...paths: Array<string | RelPath>) {
    return AbsPath.New(this.path + "/" + paths.map((p) => new RelPath(p.toString()).str).join("/"));
  }
  dirname() {
    return new AbsPath(path.dirname(this.path));
  }

  depth() {
    return this.str.split("/").length - 2;
  }

  changePrefix(newPrefix: string) {
    const ext = this.extname();
    if (!ext) return this.dirname().join(newPrefix);
    return this.dirname().join(`${newPrefix}${this.extname()}`);
  }

  shift() {
    const segments = this.str.split("/");
    segments.shift();
    segments[0] = "";
    return new AbsPath(segments.join("/"));
  }

  inc() {
    return new AbsPath(super.inc().toString());
  }

  constructor(abspath: string) {
    let p = abspath.startsWith("/") ? abspath : "/" + abspath;
    if (p !== "/") {
      p = p.replace(/\/+/g, "/"); // Ensure only one slash separates directories
      p = p.endsWith("/") ? p.slice(0, -1) : p;
    }
    super(p);
    this.path = p;
  }
}

export class RelPath extends BasePath {
  // Use the unique symbol as a brand

  //@ts-expect-er_ror
  // private [RelPathBrand]: void;

  static New(path: string) {
    return new RelPath(path);
  }
  join(...paths: Array<string | RelPath>) {
    return RelPath.New(this.path + "/" + paths.map((p) => new RelPath(p.toString()).str).join("/"));
  }
  inc() {
    return new RelPath(super.inc().toString());
  }

  dirname() {
    return new RelPath(path.dirname(this.path));
  }
  shift() {
    const segments = this.str.split("/");
    segments.shift();
    return new RelPath(segments.join("/"));
  }

  changePrefix(newPrefix: string) {
    const ext = this.extname();
    if (!ext) return this.dirname().join(newPrefix);
    return this.dirname().join(`${newPrefix}.${this.extname()}`);
  }

  changeExt(newExt: string) {
    // this.path = [this.dirname(), this.prefix(), "." + newExt.replace(/^\./, "")].join("/");
    this.dirname().join(newExt);
  }

  constructor(path: string) {
    let p = path.startsWith("/") ? path.slice(1) : path;
    p = p.endsWith("/") ? p.slice(0, -1) : p;
    super(p);
    this.path = p;
  }
}

export function relPath(path: string | RelPath) {
  return RelPath.New(String(path));
}
export function absPath(path: string | AbsPath) {
  return AbsPath.New(String(path));
}

export function isAncestor(path: AbsPath | string | null, root: AbsPath | string | null) {
  if (path === root) return true;
  if (path === null || root === null) return false;
  const rootSegments = root.split("/");
  const pathSegments = path.split("/");
  return pathSegments.slice(0, rootSegments.length).every((segment, i) => segment === rootSegments[i]);
}

export function reduceLineage<T extends (string | TreeNode)[]>(range: T): T {
  [...range].sort((a, b) => a.length - b.length);
  for (let i = 0; i < range.length; i++) {
    const a = range[i];
    for (let j = i + 1; j < range.length; j++) {
      const b = range[j];
      if (isAncestor(b.toString(), a.toString())) range.splice(j--, 1);
    }
  }
  return range;
}
