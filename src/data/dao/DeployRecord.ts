import { DestinationType } from "@/data/DestinationSchemaMap";

export interface DeployRecord<T = any> {
  guid: string;
  label: string;
  timestamp: number;
  buildId: string;
  workspaceId: string;
  provider: DestinationType;
  destinationId: string;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: DeployLogLine[];
  meta: T;
  url: string | null;
  completedAt: number | null;
  error: string | null;
}

export type DeployLogLine = {
  type: "info" | "error" | "warning" | "success";
  timestamp: number;
  message: string;
};
