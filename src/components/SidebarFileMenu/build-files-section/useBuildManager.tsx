import { BuildDAO } from "@/data/BuildDAO";
import { Workspace } from "@/data/Workspace";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

export function useBuildManager({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [build, setBuildId] = useState<string | null>(null);
  const builds = useLiveQuery(async () => BuildDAO.allForWorkspace(currentWorkspace.guid), [currentWorkspace.guid], []);
  return { builds, build: builds.find((b) => b.guid === build) || builds[0] || null, setBuildId };
}
