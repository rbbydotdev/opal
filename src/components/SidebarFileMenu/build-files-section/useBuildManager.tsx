import { Workspace } from "@/data/Workspace";
import { useBuilds } from "@/hooks/useBuilds";
import { useState } from "react";

export function useBuildManager({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [build, setBuildId] = useState<string | null>(null);
  const { builds } = useBuilds({ workspaceId: currentWorkspace.guid });
  return { builds, build: builds.find((b) => b.guid === build) || builds[0] || null, setBuildId };
}
