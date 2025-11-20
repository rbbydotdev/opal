import { DiskJType } from "@/data/DiskType";
import { AbsPath } from "@/lib/paths2";
import { BuildStrategy } from "@/builder/builder-types";

export interface BuildRecord {
  guid: string;
  label: string;
  timestamp: Date;
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
  timestamp: Date;
  message: string;
  type: "info" | "error";
};
