import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { AnyDeployRunner, NullDeployRunner } from "@/services/deploy/DeployRunner";
import { useRunner } from "@/hooks/useRunner";
import { useMemo } from "react";

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

  const runner = useRunner(() => deployRunner, [deployRunner]);

  return {
    deployRunner: deployRunner as AnyDeployRunner<any>,
    logs: runner.logs,
    deployCompleted: runner.completed,
    deploy: (deployRunner as AnyDeployRunner<any>).deploy,
    isDeploying: runner.running,
  };
}
