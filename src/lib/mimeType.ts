import { MimeType } from "@/lib/fileType";
import { AbsPath, RelPath } from "@/lib/paths";
import mime from "mime-types";
export const getMimeType = (path: AbsPath | RelPath | string, defaultType = "text/markdown"): MimeType =>
  (mime.lookup(String(path)) || defaultType) as MimeType;
