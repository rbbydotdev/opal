import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

/*

  Prettify is used so their parity between the editor which goes from 
  mdast tree to text/plain and back. Because of this, we need to prettify
  so the indexes are predictable when searching

  Ideally this would be ran inside the service worker before the search,
  but the SW is struggling with some of the main thread browser deps like 'document'

  TODO: run in search query 

*/

// Helper to schedule a function during idle time (with fallback)
function runWhenIdle(fn: () => void, timeout: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (window as any).requestIdleCallback === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, timeout ?? 0);
  }
}

export function prettifyMarkdownSync(source: string): string {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdx).use(remarkDirective).use(remarkStringify, {
    bullet: "-",
    fences: true,
    listItemIndent: "one",
  });

  const file = processor.processSync(source);
  return String(file);
}

export function prettifyMarkdownAsync(source: string): Promise<string> {
  return new Promise((resolve) => {
    runWhenIdle(() => {
      resolve(prettifyMarkdownSync(source));
    }, 500);
  });
}
