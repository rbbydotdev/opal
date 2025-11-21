import { WorkspaceDAO } from "@/data/WorkspaceDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useWorkspaces() {
  return (useLiveQuery(() => WorkspaceDAO.all(), [], []) as WorkspaceDAO[]) || [];
}
