/**
 * Sanitization utilities for imported files
 */

import DOMPurify from "dompurify";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const ALLOWED_TAGS = ["p", "h1", "h2", "h3", "strong", "em", "a", "ul", "ol", "li", "code", "pre", "blockquote", "img"];
const ALLOWED_ATTR = ["href", "title", "src", "alt"];

/**
 * Sanitize file content if it's a markdown, HTML, or SVG file
 */
export function sanitizeIfNeeded(filePath: string, content: Uint8Array): Uint8Array {
  const path = filePath.toLowerCase();

  if (path.endsWith(".md") || path.endsWith(".markdown")) {
    return sanitizeMarkdown(content);
  }
  if (path.endsWith(".html") || path.endsWith(".htm") || path.endsWith(".svg")) {
    return sanitizeHtml(content);
  }

  return content;
}

function sanitizeMarkdown(content: Uint8Array): Uint8Array {
  const text = textDecoder.decode(content);

  const result = unified()
    .use(remarkParse)
    .use(() => (tree) => {
      visit(tree, "html", (node: any) => {
        if (node.value) {
          node.value = DOMPurify.sanitize(node.value, {
            ALLOWED_TAGS,
            ALLOWED_ATTR,
          });
        }
      });
    })
    .use(remarkStringify)
    .processSync(text);

  return textEncoder.encode(String(result));
}

function sanitizeHtml(content: Uint8Array): Uint8Array {
  const text = textDecoder.decode(content);
  const sanitized = DOMPurify.sanitize(text);
  return textEncoder.encode(sanitized);
}
