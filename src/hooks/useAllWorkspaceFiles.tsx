import { WorkspaceDAO } from "@/data/WorkspaceDAO";
import { useCrossWorkspaceFilenameSearch } from "@/hooks/useCrossWorkspaceFilenameSearch";
import { AbsPath } from "@/lib/paths2";
import { useCallback } from "react";

export interface FileWithWorkspace {
  path: AbsPath;
  workspaceName: string;
  workspaceHref: string;
}
