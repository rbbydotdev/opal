import { WorkspaceDAO } from "@/data/DAO/WorkspaceDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useWorkspaces() {
  return (useLiveQuery(() => WorkspaceDAO.all(), [], []) as WorkspaceDAO[]) || [];
}
