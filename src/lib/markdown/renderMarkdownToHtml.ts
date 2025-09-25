import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
// import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export function renderMarkdownToHtml(source: string): string {
  if (!source) return "";
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // .use(remarkDirective)
    // .use(remarkMdx)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = processor.processSync(source);
  return String(file);
}
