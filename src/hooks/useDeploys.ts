import { DeployDAO } from "@/data/DeployDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useDeploys(): {
  deploys: DeployDAO[];
} {
  const deploys = useLiveQuery(() => DeployDAO.all(), [], []);
  return {
    deploys,
  };
}
