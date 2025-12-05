import { BuildDAO } from "@/data/dao/BuildDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useBuilds({ workspaceId }: { workspaceId: string }): {
  builds: BuildDAO[];
} {
  const builds = useLiveQuery(async () => BuildDAO.allForWorkspace(workspaceId), [workspaceId]) || [];
  return {
    builds,
  };
}
