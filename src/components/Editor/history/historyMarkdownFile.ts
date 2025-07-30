import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { getMarkdownData, setFrontmatter } from "@/lib/markdown/getMarkdownData";
import { absPath, joinPath } from "@/lib/paths2";
import { nanoid } from "nanoid";

export const DOC_ID_IDENTIFIER = "documentId";
export function historyMarkdown(md: string) {
  return setFrontmatter(md, { [DOC_ID_IDENTIFIER]: nanoid() });
}

export function useWorkspaceDocumentId(contents: string | null) {
  //should probably look at the document contents and parse the id: in the front matter
  const { path: filePath, id: workspaceId } = useWorkspaceRoute();
  return (
    (getMarkdownData(contents ?? "")?.documentId as string) ??
    (filePath && workspaceId ? joinPath(absPath(workspaceId), absPath(filePath)) : null)
  );
}
