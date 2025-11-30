export interface DeployRecord<T = any> {
  guid: string;
  label: string;
  timestamp: number;
  buildId: string;
  workspaceId: string;
  destinationType: "cloudflare" | "netlify" | "github" | "vercel" | "aws";
  destinationName: string;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: DeployLogLine[];
  data: T;
  completedAt: number | null;
  error: string | null;
}

export type DeployLogLine = {
  type: "info" | "error" | "warning" | "success";
  timestamp: number;
  message: string;
};
