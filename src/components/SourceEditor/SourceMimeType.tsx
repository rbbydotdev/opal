import { OpalMimeType } from "@/lib/fileType";

export type SourceMimeType = Extract<
  OpalMimeType,
  | "text/css"
  | "text/plain"
  | "text/markdown"
  | "text/html"
  | "application/xml"
  | "text/x-mustache"
  | "text/x-ejs"
  | "application/json"
  | "application/javascript"
>;
export const isSourceMimeType = (mimeType: string): mimeType is SourceMimeType =>
  [
    "text/css",
    "application/json",
    "application/javascript",
    "text/plain",
    "text/markdown",
    "application/xml",
    "text/html",
    "text/x-mustache",
    "text/x-ejs",
  ].includes(mimeType);
