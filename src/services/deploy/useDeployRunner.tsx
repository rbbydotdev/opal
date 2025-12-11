import { BuildDAO } from "@/data/dao/BuildDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { AnyDeployRunner, NullDeployRunner } from "@/services/deploy/DeployRunner";
import { useMemo, useSyncExternalStore } from "react";

export function useDeployRunner({
  build,
  destination,
  workspaceId,
  label,
}: {
  build: BuildDAO;
  destination: DestinationDAO | null;
  workspaceId: string;
  label: string;
}) {
  const deployRunner = useMemo(
    () =>
      destination === null
        ? new NullDeployRunner()
        : AnyDeployRunner.Create({
            build,
            destination,
            workspaceId,
            label,
          }),
    [build, destination, label, workspaceId]
  );

  const logs = useSyncExternalStore(deployRunner.onLog, deployRunner.getLogs);
  return { deployRunner, logs: logs || [] };
}
