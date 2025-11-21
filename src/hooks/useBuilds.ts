import { BuildDAO } from "@/data/BuildDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useBuilds({ workspaceId }: { workspaceId: string }): {
  builds: BuildDAO[];
} {
  const builds = useLiveQuery(async () => BuildDAO.allForWorkspace(workspaceId), [workspaceId]) || [];
  return {
    builds,
  };
}
