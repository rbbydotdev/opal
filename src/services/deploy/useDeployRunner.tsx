import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { AnyDeployRunner, NullDeployRunner } from "@/services/deploy/DeployRunner";
import { useMemo, useSyncExternalStore } from "react";

export function useDeployRunner({
  build,
  deploy,
  destination,
  workspaceId,
  label,
}: {
  build: BuildDAO;
  deploy: DeployDAO | null;
  destination: DestinationDAO | null;
  workspaceId: string;
  label: string;
}) {
  const deployRunner = useMemo(() => {
    return destination === null
      ? new NullDeployRunner()
      : AnyDeployRunner.Create({
          build,
          deploy,
          destination,
          workspaceId,
          label,
        });
  }, [build, destination, label, workspaceId, deploy]);

  const logs = useSyncExternalStore(deployRunner.onLog, deployRunner.getLogs);

  // Subscribe to deploy updates to trigger re-renders when state changes
  const onUpdate = (callback: () => void) => {
    return deployRunner.emitter.on("update", callback);
  };
  const getState = () => deployRunner.deploy;
  useSyncExternalStore(onUpdate, getState);

  return { deployRunner, logs: logs || [] };
}
