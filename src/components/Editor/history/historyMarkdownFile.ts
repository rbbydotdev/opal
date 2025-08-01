import { setFrontmatter } from "@/lib/markdown/frontMatter";
import { nanoid } from "nanoid";

export const DOC_ID_IDENTIFIER = "documentId";
export function historyMarkdown(md: string) {
  return setFrontmatter(md, { [DOC_ID_IDENTIFIER]: nanoid() });
}
