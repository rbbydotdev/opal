import path from "path";

// Define unique symbols for branding
declare const AbsPathBrand: unique symbol;
declare const RelPathBrand: unique symbol;

export class AbsPath extends String {
  // Use the unique symbol as a brand
  //@ts-expect-error
  private [AbsPathBrand]: void;

  public readonly path: string;

  static New(path: string) {
    return new AbsPath(path);
  }
  get str() {
    return this.toString();
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

  constructor(path: string) {
    let p = path.startsWith("/") ? path : "/" + path;
    p = p.endsWith("/") ? p.slice(0, -1) : p;
    super(p);
    this.path = p;
  }
}

export class RelPath extends String {
  // Use the unique symbol as a brand

  //@ts-expect-error
  private [RelPathBrand]: void;

  public readonly path: string;

  get str() {
    return this.toString();
  }
  static New(path: string) {
    return new RelPath(path);
  }
  join(...paths: Array<string | RelPath>) {
    return RelPath.New(this.path + "/" + paths.map((p) => new RelPath(p.toString()).str).join("/"));
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
