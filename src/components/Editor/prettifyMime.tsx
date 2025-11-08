import { OpalMimeType } from "@/lib/fileType";
import parserBabel from "prettier/plugins/babel.js";
import parserHtml from "prettier/plugins/html.js";
import parserMarkdown from "prettier/plugins/markdown.js";
import parserPostcss from "prettier/plugins/postcss.js";
import * as prettier from "prettier/standalone.js";

export function prettifyMime(mimeType: OpalMimeType, content: string): Promise<string> {
  switch (mimeType) {
    case "text/css":
      return prettier.format(content, {
        parser: "css",
        plugins: [parserBabel, parserPostcss],
      });
    case "text/markdown":
      return prettier.format(content, {
        parser: "markdown",
        plugins: [parserMarkdown],
      });
    case "text/x-ejs":
    case "text/x-mustache":
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
    ["text/css", "text/javascript", "text/markdown", "text/x-mustache", "text/x-ejs", "text/html"] satisfies Array<
      typeof mimeType | "text/javascript"
    >
  ).includes(mimeType);
}
