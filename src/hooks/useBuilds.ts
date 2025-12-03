import { BuildDAO } from "@/data/DAO/BuildDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useBuilds({ workspaceId }: { workspaceId: string }): {
  builds: BuildDAO[];
} {
  const builds = useLiveQuery(async () => BuildDAO.allForWorkspace(workspaceId), [workspaceId]) || [];
  return {
    builds,
  };
}
