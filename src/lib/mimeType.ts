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

  // Handle .njk files specially since mime-types doesn't recognize them
  if (filePath.endsWith(".njk") || filePath.endsWith(".nunjucks")) {
    return MimeTypes.NUNCHUCKS;
  }

  // Handle .liquid files specially since mime-types doesn't recognize them
  if (filePath.endsWith(".liquid")) {
    return MimeTypes.LIQUID;
  }

  // Handle .html files
  if (filePath.endsWith(".html") || filePath.endsWith(".htm")) {
    return MimeTypes.HTML;
  }

  if (filePath.endsWith(".xml")) {
    return MimeTypes.XML;
  }

  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return MimeTypes.YAML;
  }

  // Handle .js files
  if (filePath.endsWith(".js")) {
    return MimeTypes.JAVASCRIPT;
  }

  // Handle .json files
  if (filePath.endsWith(".json")) {
    return MimeTypes.JSON;
  }

  return (mime.lookup(filePath) || "") as OpalMimeType;
};
