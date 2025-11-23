import { BuildDAO, BuildJType } from "@/data/BuildDAO";
import { BuildLogLine } from "@/data/BuildRecord";

export interface DeployRecord<T = any> {
  guid: string;
  label: string;
  timestamp: number;
  build: BuildDAO | BuildJType;
  workspaceId: string;
  destinationType: "cloudflare" | "netlify" | "github" | "vercel" | "aws";
  destinationName: string;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: DeployLogLine[];
  data: T;
  completedAt: number | null;
  error: string | null;
}

export type DeployLogLine = BuildLogLine & {
  type: "info" | "error" | "warning" | "success";
};
