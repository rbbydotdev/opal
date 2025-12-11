import { decodePath } from "@/lib/paths2";
import graymatter from "gray-matter";
import mdast from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export function replaceFileUrlsInMarkdown(
  markdown: string,
  findReplace: [fromUrl: string, toUrl: string][],
  origin = ""
): [content: string, changed: boolean] {
  const { data, content } = graymatter(markdown);

  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

  // Parse the markdown into an AST
  const tree = processor.parse(content);
  let changed = false;

  // Helper function to process URL replacement
  const processUrl = (url: string): string => {
    for (const [fromUrl, toUrl] of findReplace) {
      const decodedFromUrl = decodePath(fromUrl);
      const decodedToUrl = decodePath(toUrl);
      let pathname = decodePath(url);

      if (pathname.startsWith(origin) && (pathname.startsWith("http://") || pathname.startsWith("https://"))) {
        try {
          const urlObj = new URL(pathname);
          pathname = urlObj.pathname;
        } catch (_e) {}
      }

      if (pathname === decodedFromUrl) {
        changed = true;
        // encode ? return encodePath(decodedToUrl);
        return decodedToUrl;
      }
    }
    return url;
  };

  // Visit all image nodes and replace URLs as needed
  visit(tree, "image", (node: mdast.Image) => {
    node.url = processUrl(node.url);
  });

  // Visit all link nodes and replace URLs as needed
  visit(tree, "link", (node: mdast.Link) => {
    node.url = processUrl(node.url);
  });

  // Stringify the AST back to markdown
  const processed = graymatter.stringify(
    unified()
      .use(remarkStringify, {
        bullet: "-",
        fences: true,
        listItemIndent: "one",
      })
      .use(remarkGfm)
      .stringify(tree),
    data
  );

  return [processed, changed];
}
