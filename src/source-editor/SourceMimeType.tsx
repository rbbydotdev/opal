import { OpalMimeType } from "@/lib/fileType";

export type SourceMimeType = Extract<
  OpalMimeType,
  | "application/javascript"
  | "application/json"
  | "application/xml"
  | "text/css"
  | "text/html"
  | "text/markdown"
  | "text/plain"
  | "text/x-ejs"
  | "text/x-mustache"
  | "text/x-nunchucks"
  | "text/x-liquid"
>;
export const isSourceMimeType = (mimeType: string): mimeType is SourceMimeType =>
  [
    "application/javascript",
    "application/json",
    "application/xml",
    "text/css",
    "text/html",
    "text/markdown",
    "text/plain",
    "text/x-ejs",
    "text/x-mustache",
    "text/x-nunchucks",
    "text/x-liquid",
  ].includes(mimeType);
