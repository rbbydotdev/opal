import { AbsPath, RelPath } from "@/lib/paths";
import mime from "mime-types";
export const getMimeType = (path: AbsPath | RelPath | string, defaultType = "text/markdown") =>
  mime.lookup(String(path)) || defaultType;
