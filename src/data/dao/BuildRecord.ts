import { DiskJType } from "@/data/disk/DiskType";
import { AbsPath } from "@/lib/paths2";
import { LogLine } from "@/types/RunnerTypes";

export type BuildStrategy = "freeform" | "book" | "blog" | "eleventy";

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
  error: string | null;
  status: "success" | "error" | "pending" | "idle";
  logs: LogLine[];
}
