import { AbsPath } from "@/lib/paths2";

export interface FileWithWorkspace {
  path: AbsPath;
  workspaceName: string;
  workspaceHref: string;
}
