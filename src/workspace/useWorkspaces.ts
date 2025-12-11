import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useWorkspaces() {
  return (useLiveQuery(() => WorkspaceDAO.all(), [], []) as WorkspaceDAO[]) || [];
}
