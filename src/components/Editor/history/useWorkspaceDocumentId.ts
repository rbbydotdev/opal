import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { getMarkdownData } from "@/lib/markdown/frontMatter";
import { absPath, joinPath } from "@/lib/paths2";

export function useWorkspaceDocumentId(contents: string | null) {
  //should probably look at the document contents and parse the id: in the front matter
  const { path: filePath } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace.id; // Use the stable workspace GUID, not the name
  return (
    (getMarkdownData(contents ?? "")?.documentId as string) ??
    (filePath && !currentWorkspace.isNull ? joinPath(absPath(workspaceId), absPath(filePath)) : null)
  );
}
