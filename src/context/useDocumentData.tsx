import matter from "gray-matter";
import { useMemo } from "react";

export function useDocumentData(markdown: string | null) {
  return useMemo(() => {
    const md = matter(markdown || "");
    const frontmatter = {
      ...(md.data ?? {}),
    };
    return { data: frontmatter, content: md.content };
  }, [markdown]);
}
