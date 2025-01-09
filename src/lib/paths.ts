import path from "path";

export class AbsPath extends String {
  public readonly path: string;

  static New(path: string) {
    return new AbsPath(path);
  }
  get str() {
    return this.toString();
  }
  join(...paths: string[] | RelPath[]) {
    return AbsPath.New(this.path + "/" + paths.map((p) => new RelPath(p.toString()).str).join("/"));
  }
  dirname() {
    return path.dirname(this.path);
  }
  basename() {
    return path.basename(this.path);
  }

  constructor(path: string) {
    let p = path.startsWith("/") ? path : "/" + path;
    p = p.endsWith("/") ? p.slice(0, -1) : p;
    super(p);
    this.path = p;
  }
}
export class RelPath extends String {
  public readonly path: string;

  get str() {
    return this.toString();
  }
  static New(path: string) {
    return new RelPath(path);
  }
  join(...paths: string[] | RelPath[]) {
    return RelPath.New(this.path + "/" + paths.map((p) => new RelPath(p.toString()).str).join("/"));
  }

  dirname() {
    return path.dirname(this.path);
  }
  basename() {
    return path.basename(this.path);
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
