import { decodePath, encodePath } from "@/lib/paths2";
import graymatter from "gray-matter";
import mdast from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
export function replaceImageUrlsInMarkdown(
  markdown: string,
  findReplace: [fromUrl: string, toUrl: string][],
  _origin = ""
): [content: string, changed: boolean] {
  const { data, content } = graymatter(markdown);

  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

  // Parse the markdown into an AST
  const tree = processor.parse(content);
  let changed = false;

  // Visit all image nodes and replace URLs as needed
  visit(tree, "image", (node: mdast.Image) => {
    for (const [fromUrl, toUrl] of findReplace) {
      const decodedFromUrl = decodePath(fromUrl);
      const decodedToUrl = decodePath(toUrl);
      let pathname = decodePath(node.url);
      if (pathname.startsWith(origin) && (pathname.startsWith("http://") || pathname.startsWith("https://"))) {
        try {
          const url = new URL(pathname);
          pathname = url.pathname;
        } catch (_e) {}
      }
      if (pathname === decodedFromUrl) {
        node.url = encodePath(decodedToUrl);
        changed = true;
        break;
      }
    }
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
