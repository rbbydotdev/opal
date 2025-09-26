import { MimeType, FileTypes } from "@/lib/fileType";
import mime from "mime-types";

export const getMimeType = (path: string): MimeType => {
  const filePath = String(path).toLowerCase();
  
  // Handle .ejs files specially since mime-types doesn't recognize them
  if (filePath.endsWith('.ejs')) {
    return FileTypes.EJS;
  }
  
  // Handle .html files
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
    return FileTypes.HTML;
  }
  
  return (mime.lookup(filePath) || "") as MimeType;
};
