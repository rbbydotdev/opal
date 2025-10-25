import { useCallback, useState } from "react";
import { usePreventNavigation } from "@/lib/usePreventNavigation";

export function useBuildExecution() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildAbortController, setBuildAbortController] = useState<AbortController | null>(null);

  usePreventNavigation(isBuilding, "Build in progress. Are you sure you want to leave?");

  const startBuild = useCallback(() => {
    const abortController = new AbortController();
    setIsBuilding(true);
    setBuildAbortController(abortController);
    return abortController;
  }, []);

  const finishBuild = useCallback(() => {
    setIsBuilding(false);
    setBuildAbortController(null);
  }, []);

  const cancelBuild = useCallback(() => {
    if (buildAbortController) {
      buildAbortController.abort();
    }
    setIsBuilding(false);
    setBuildAbortController(null);
  }, [buildAbortController]);

  return {
    isBuilding,
    buildAbortController,
    startBuild,
    finishBuild,
    cancelBuild,
  };
}