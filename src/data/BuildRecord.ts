import { DiskRecord } from "@/data/disk/DiskRecord";
import { AbsPath } from "@/lib/paths2";

export interface BuildRecord {
  guid: string;
  label: string;
  timestamp: Date;
  disk: DiskRecord;
  workspaceId: string;
  buildPath: AbsPath;
  fileCount: number;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: BuildLogLine[];
}

export type BuildLogLine = {
  timestamp: Date;
  message: string;
  type: "info" | "error";
};
