import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

export function renderHtmlToMarkdown(source: string): string {
  if (!source) return "";
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify, {
      fences: true,
      bullet: "-",
      listItemIndent: "one",
    });

  const file = processor.processSync(source);
  return String(file);
  // const md = String(file);

  // // Ensure image URLs are wrapped in angle brackets: ![alt](<url> "title")
  // // - If already wrapped with '<' as first char inside (), leave as-is.
  // // - Preserve any title (e.g. "title" or 'title' or (title)).
  // const result = md.replace(/!\[([^\]]*)\]\(\s*([^\)]*?)\s*\)/g, (_match, alt, urlAndTitle) => {
  //   const trimmed = urlAndTitle.trim();
  //   if (trimmed.startsWith("<")) {
  //     // already has angle brackets
  //     return `![${alt}](${trimmed})`;
  //   }

  //   // Find start of title: a space followed by a quote, double-quote, or opening paren
  //   const titleStartMatch = trimmed.search(/\s+(?=["'()])/);
  //   let urlPart: string;
  //   let titlePart = "";
  //   if (titleStartMatch !== -1) {
  //     urlPart = trimmed.slice(0, titleStartMatch);
  //     titlePart = trimmed.slice(titleStartMatch);
  //   } else {
  //     urlPart = trimmed;
  //   }

  //   return `![${alt}](<${urlPart}>${titlePart})`;
  // });

  // return result;
}
