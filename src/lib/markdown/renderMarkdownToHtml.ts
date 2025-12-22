import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
// import remarkDirective from "remark-directive";

export function renderMarkdownToHtml(source: string): string {
  if (!source) return "";
  const processor = unified()
    // .use(remarkDirective)
    // .use(remarkMdx)
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = processor.processSync(source);
  return String(file);
}

export async function renderMarkdownToHtmlAsync(source?: string | null): Promise<string> {
  if (!source) return "";
  const processor = unified()
    // .use(remarkDirective)
    // .use(remarkMdx)
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(source);
  return String(file);
}
