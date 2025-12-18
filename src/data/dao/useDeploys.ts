import { DeployDAO } from "@/data/dao/DeployDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useDeploys({ workspaceId }: { workspaceId: string }): {
  deploys: DeployDAO[];
} {
  const deploys = useLiveQuery(() => DeployDAO.all(), [], []) as DeployDAO[];
  return {
    deploys,
  };
}
