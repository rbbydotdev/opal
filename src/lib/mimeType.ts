import { MimeType } from "@/lib/fileType";
import { AbsPath, RelPath } from "@/lib/paths";
import mime from "mime-types";
export const getMimeType = (path: AbsPath | RelPath | string): MimeType =>
  (mime.lookup(String(path)) || "") as MimeType;
