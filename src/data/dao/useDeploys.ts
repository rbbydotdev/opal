import { DeployDAO } from "@/data/dao/DeployDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useDeploys({ workspaceId }: { workspaceId: string }): {
  deploys: DeployDAO[];
} {
  const deploys = useLiveQuery(() => DeployDAO.allForWorkspace(workspaceId), [workspaceId], []) as DeployDAO[];
  return {
    deploys,
  };
}
