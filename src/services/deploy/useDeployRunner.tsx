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

  // Subscribe to deploy updates to trigger re-renders when state changes
  const onUpdate = (callback: () => void) => {
    return deployRunner.emitter.on("update", callback);
  };
  const getState = () => deployRunner.deploy;
  useSyncExternalStore(onUpdate, getState);

  return { deployRunner, logs: logs || [] };
}
