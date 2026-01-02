import { OpalMimeType } from "@/lib/fileType";
import parserBabel from "prettier/plugins/babel";
import parserHtml from "prettier/plugins/html";
import parserMarkdown from "prettier/plugins/markdown";
import parserPostcss from "prettier/plugins/postcss";
import * as prettier from "prettier/standalone";

export function prettifyMime(mimeType: OpalMimeType, content: string): Promise<string> {
  switch (mimeType) {
    case "text/css":
      return prettier.format(content, {
        parser: "css",
        plugins: [parserBabel, parserPostcss],
      });
    case "text/javascript":
      return prettier.format(content, {
        parser: "babel",
        plugins: [parserBabel],
      });
    case "application/json":
      try {
        // Parse and stringify to format JSON
        const parsed = JSON.parse(content);
        return Promise.resolve(JSON.stringify(parsed, null, 2));
      } catch (error) {
        // If parsing fails, return original content
        return Promise.resolve(content);
      }
    case "text/markdown":
      return prettier.format(content, {
        parser: "markdown",
        plugins: [parserMarkdown],
      });
    case "text/x-ejs":
    case "text/x-mustache":
    case "text/x-nunchucks":
    case "text/x-liquid":
    case "text/html":
      return prettier.format(content, {
        parser: "html",
        plugins: [parserHtml],
      });
    default:
      return Promise.resolve(content);
  }
}
export function canPrettifyMime(mimeType: OpalMimeType | null | undefined): boolean {
  if (!mimeType) return false;
  return (
    ["text/css", "text/javascript", "application/json", "text/markdown", "text/x-mustache", "text/x-ejs", "text/x-nunchucks", "text/x-liquid", "text/html"] satisfies Array<
      typeof mimeType | "text/javascript" | "application/json"
    >
  ).includes(mimeType);
}
