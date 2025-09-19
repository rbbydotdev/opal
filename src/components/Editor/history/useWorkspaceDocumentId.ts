import { getMarkdownData } from "@/lib/markdown/frontMatter";
import { nanoid } from "nanoid";

export function useWorkspaceDocumentId(contents: string | null) {
  return (
    (getMarkdownData(contents ?? "")?.documentId as string) ?? nanoid() // Generate a random ID if we can't find one
  );
}
