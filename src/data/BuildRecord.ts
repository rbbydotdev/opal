import { AbsPath } from "@/lib/paths2";

export interface BuildRecord {
  guid: string;
  label: string;
  timestamp: Date;
  diskId: string;
  buildPath: AbsPath;
  logs: BuildLogLine[];
}

export type BuildLogLine = {
  timestamp: Date;
  message: string;
  type: "info" | "error" | "warning";
};
