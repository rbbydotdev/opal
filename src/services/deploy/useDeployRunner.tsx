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
  const deployCompleted = useSyncExternalStore(deployRunner.onComplete, deployRunner.getComplete);
  const deployWatch = useSyncExternalStore(deployRunner.onUpdate, deployRunner.getDeploy);
  return { deployRunner, logs: logs ?? [], deployCompleted, deploy: deployWatch };
}
