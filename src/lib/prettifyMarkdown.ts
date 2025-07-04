import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

// Helper to schedule a function during idle time (with fallback)
function runWhenIdle(fn: () => void, timeout: number) {
  try {
    window.requestIdleCallback(fn, { timeout });
  } catch (_e) {
    setTimeout(fn, timeout ?? 0);
  }
}

export function prettifyMarkdownSync(source: string): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm) /*.use(remarkMdx)*/
    .use(remarkDirective)
    .use(remarkStringify, {
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
