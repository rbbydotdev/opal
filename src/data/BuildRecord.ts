import { DiskJType } from "@/data/DiskType";
import { AbsPath } from "@/lib/paths2";

export type BuildStrategy = "freeform" | "book" | "blog";

export interface BuildRecord {
  guid: string;
  label: string;
  timestamp: number;
  disk: DiskJType;
  sourceDisk: DiskJType;
  sourcePath: AbsPath;
  strategy: BuildStrategy;
  workspaceId: string;
  buildPath: AbsPath;
  fileCount: number;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: BuildLogLine[];
}

export type BuildLogLine = {
  timestamp: number;
  message: string;
  type: "info" | "error";
};
