export interface BuildRecord {
  guid: string;
  label: string;
  timestamp: Date;
  diskId: string;
  logs: BuildLogLine[];
}

export type BuildLogLine = {
  timestamp: Date;
  message: string;
  type: "info" | "error" | "warning";
};
