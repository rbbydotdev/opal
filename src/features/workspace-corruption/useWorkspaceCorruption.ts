import { useState } from "react";
import { analyzeWorkspaceError } from "./errorDetection";
import { WorkspaceCorruptionState } from "./types";

export function useWorkspaceCorruption() {
  const [errorState, setErrorState] = useState<WorkspaceCorruptionState | null>(null);

  const handleWorkspaceError = async (workspaceName: string, error: Error) => {
    // Prevent duplicate error handling
    if (errorState?.hasError) return;

    const newErrorState = await analyzeWorkspaceError(workspaceName, error);
    setErrorState(newErrorState);
  };

  const clearError = () => {
    setErrorState(null);
  };

  const shouldPreventInitialization = (workspaceName: string) => {
    return errorState?.hasError && errorState.workspaceName === workspaceName;
  };

  return {
    errorState,
    handleWorkspaceError,
    clearError,
    shouldPreventInitialization,
  };
}