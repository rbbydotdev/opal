export const MimeTypes = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  WEBP: "image/webp",
  BIN: "application/octet-stream",
  GIF: "image/gif",
  MARKDOWN: "text/markdown",
  CSS: "text/css",
  EJS: "text/x-ejs",
  YAML: "application/yaml",
  MUSTACHE: "text/x-mustache",
  NUNCHUCKS: "text/x-nunchucks",
  LIQUID: "text/x-liquid",
  HTML: "text/html",
  XML: "application/xml",
  PLAIN: "text/plain",
  JAVASCRIPT: "text/javascript",
  JSON: "application/json",
} as const;

export const StringMimeTypes = [
  "text/markdown",
  "text/css",
  "text/x-ejs",
  "application/yaml",
  "text/x-mustache",
  "text/x-nunchucks",
  "text/x-liquid",
  "text/html",
  "application/xml",
  "text/plain",
  "text/javascript",
  "application/json",
] as const satisfies Partial<OpalMimeType>[];

const MimeTypeExt = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/octet-stream": "bin",
  "text/markdown": "md",
  "text/css": "css",
  "text/plain": "txt",
  "text/x-ejs": "ejs",
  "application/yaml": "yaml",
  "text/x-mustache": "mustache",
  "text/x-nunchucks": "njk",
  "text/x-liquid": "liquid",
  "text/html": "html",
  "application/xml": "xml",
  "text/javascript": "js",
  "application/json": "json",
} as const;

export type OpalMimeType = (typeof MimeTypes)[keyof typeof MimeTypes];

export const isImageType = (type: OpalMimeType | string): boolean => {
  return type.startsWith("image/");
};
export const isMarkdownType = (type: OpalMimeType | string): boolean => {
  return type === MimeTypes.MARKDOWN;
};

function getFileType(data: string | Uint8Array<ArrayBufferLike>): OpalMimeType {
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
function isBinary(buffer: Uint8Array<ArrayBufferLike>, maxLength = 128): boolean {
  for (let i = 0; i <= Math.min(maxLength, buffer.length); i++) {
    if (buffer[i]! ?? 0 > 127) {
      return true; // Non-ASCII character found, likely binary
    }
  }
  return false; // All characters are ASCII, likely text
}
