export const MimeTypes = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  GIF: "image/gif",
  WEBP: "image/webp",
  BIN: "application/octet-stream",
  MARKDOWN: "text/markdown",
  CSS: "text/css",
  EJS: "text/x-ejs",
  MUSTACHE: "text/x-mustache",
  HTML: "text/html",
} as const;

export const MimeTypeExt = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/octet-stream": "bin",
  "text/markdown": "md",
  "text/css": "css",
  "text/x-ejs": "ejs",
  "text/x-mustache": "mustache",
  "text/html": "html",
} as const;

export type MimeType = (typeof MimeTypes)[keyof typeof MimeTypes];

export const isImageType = (type: MimeType | string): boolean => {
  return type.startsWith("image/");
};
export const isMarkdownType = (type: MimeType | string): boolean => {
  return type === MimeTypes.MARKDOWN;
};
export const isHtmlType = (type: MimeType | string): boolean => {
  return type === MimeTypes.HTML;
};
export const isMustacheType = (type: MimeType | string): boolean => {
  return type === MimeTypes.MUSTACHE;
};
export const isBinaryType = (type: MimeType | string): boolean => {
  return type === MimeTypes.BIN;
};
export function contentsToMimeType(contents: Uint8Array<ArrayBufferLike>): MimeType {
  return getFileType(contents);
}

export function getMimeTypeExt(fileType: MimeType) {
  return MimeTypeExt[fileType];
}

export function getFileType(data: string | Uint8Array<ArrayBufferLike>): MimeType {
  if (typeof data === "string") return MimeTypes.MARKDOWN;
  // Check for JPEG (FF D8 FF)
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return MimeTypes.JPEG;
  }

  // Check for PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return MimeTypes.PNG;
  }

  // Check for GIF (47 49 46 38)
  if (
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38 &&
    (data[4] === 0x39 || data[4] === 0x37) &&
    data[5] === 0x61
  ) {
    return MimeTypes.GIF;
  }

  if (
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x41 &&
    data[10] === 0x56 &&
    data[11] === 0x45
  ) {
    return MimeTypes.WEBP;
  }
  return isBinary(data) ? MimeTypes.BIN : MimeTypes.MARKDOWN;
}
export function isBinary(buffer: Uint8Array<ArrayBufferLike>, maxLength = 128): boolean {
  for (let i = 0; i <= Math.min(maxLength, buffer.length); i++) {
    if (buffer[i]! ?? 0 > 127) {
      return true; // Non-ASCII character found, likely binary
    }
  }
  return false; // All characters are ASCII, likely text
}
