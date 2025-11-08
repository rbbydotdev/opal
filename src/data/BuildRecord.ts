import { Disk } from "@/data/disk/Disk";
import { DiskJType } from "@/data/DiskType";
import { AbsPath } from "@/lib/paths2";

export interface BuildRecord {
  guid: string;
  label: string;
  timestamp: Date;
  disk: Disk | DiskJType;
  workspaceId: string;
  buildPath: AbsPath;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: BuildLogLine[];
}

export type BuildLogLine = {
  timestamp: Date;
  message: string;
  type: "info" | "error";
};
