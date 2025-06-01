import { MimeType } from "@/lib/fileType";
import mime from "mime-types";
export const getMimeType = (path: string): MimeType => (mime.lookup(String(path)) || "") as MimeType;
