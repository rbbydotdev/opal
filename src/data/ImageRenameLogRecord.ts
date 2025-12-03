import { AbsPath } from "@/lib/paths2";

export interface ImageRenameLogRecord {
  workspaceId: string;
  oldPath: AbsPath;
  newPath: AbsPath;
  timestamp?: Date;
}