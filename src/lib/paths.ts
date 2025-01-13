import path from "path";

// Define unique symbols for branding
const AbsPathBrand = Symbol("AbsPath");
const RelPathBrand = Symbol("RelPath");

export class BasePath extends String {
  constructor(filePath: string) {
    super(filePath);
  }
  get str() {
    return this.toString();
  }

  equals(p?: BasePath | null) {
    if (!p) return false;
    return this.str === p.str;
  }

  valueOf(): string {
    return this.str;
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
  //@ts-ignore
  private [AbsPathBrand]: void;

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
  basename() {
    return new RelPath(path.basename(this.path));
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

  //@ts-expect-error
  private [RelPathBrand]: void;

  public readonly path: string;

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
  basename() {
    return new RelPath(path.basename(this.path));
  }

  constructor(path: string) {
    let p = path.startsWith("/") ? path.slice(1) : path;
    p = p.endsWith("/") ? p.slice(0, -1) : p;
    super(p);
    this.path = p;
  }
}

export function relPath(path: string) {
  return RelPath.New(path);
}
export function absPath(path: string) {
  return AbsPath.New(path);
}

export function isAncestor(path: AbsPath | string | null, root: AbsPath | string | null) {
  if (path === root) return true;
  if (path === null || root === null) return false;
  return path.replace(/^\//, "").split("/")[0] === root.replace(/^\//, "");
}
