import { MimeTypes, OpalMimeType } from "@/lib/fileType";
import mime from "mime-types";

export const getMimeType = (path: string): OpalMimeType => {
  const filePath = String(path).toLowerCase();

  // Handle .ejs files specially since mime-types doesn't recognize them
  if (filePath.endsWith(".ejs")) {
    return MimeTypes.EJS;
  }

  // Handle .mustache files specially since mime-types doesn't recognize them
  if (filePath.endsWith(".mustache")) {
    return MimeTypes.MUSTACHE;
  }

  // Handle .html files
  if (filePath.endsWith(".html") || filePath.endsWith(".htm")) {
    return MimeTypes.HTML;
  }

  return (mime.lookup(filePath) || "") as OpalMimeType;
};
