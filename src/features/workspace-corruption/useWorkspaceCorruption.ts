import { OpFsDirMountDisk } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { ServiceUnavailableError } from "@/lib/errors";
import { useState } from "react";
import { WorkspaceCorruptionState } from "./types";

export function useWorkspaceCorruption() {
  const [errorState, setErrorState] = useState<WorkspaceCorruptionState | null>(null);

  const handleWorkspaceError = async (workspaceName: string, error: Error) => {
    // Prevent duplicate error handling
    if (errorState?.hasError) return;
    const newErrorState = await analyzeWorkspaceError(workspaceName, error);
    setErrorState(newErrorState);
  };

  const clearError = () => setErrorState(null);

  const shouldPreventInitialization = (workspaceName: string) =>
    errorState?.hasError && errorState.workspaceName === workspaceName;

  return {
    errorState,
    handleWorkspaceError,
    clearError,
    shouldPreventInitialization,
  };
}

/**
 * Analyzes a workspace initialization error and returns appropriate error state
 */
export async function analyzeWorkspaceError(workspaceName: string, error: Error): Promise<WorkspaceCorruptionState> {
  // Try to get workspace DAO to check disk type for OPFS handle revocation
  let workspaceForRecovery: Workspace | undefined;
  let workspaceId: string | undefined;
  try {
    const workspaceDAO = await WorkspaceDAO.FetchFromName(workspaceName).catch(() => null);
    workspaceId = workspaceDAO?.guid;
    workspaceForRecovery = workspaceDAO?.toModel();
  } catch (e) {
    console.debug("Could not fetch workspace for recovery check:", e);
  }

  if (error instanceof ServiceUnavailableError) {
    const isOpfsRevoked = workspaceForRecovery ? await checkOpfsHandleRevocation(workspaceForRecovery, error) : false;
    const diskType = workspaceForRecovery?.getDisk().type ?? null;

    if (isOpfsRevoked) {
      return {
        hasError: true,
        errorType: "opfs_revoked",
        errorMessage: `Workspace "${workspaceName}" lost access to its directory. This happens when the browser revokes file system access or if the folder was moved. You can select the directory again or create a new workspace for the current location.`,
        workspaceName,
        workspaceId,
        canRecover: true,
      };
    } else {
      return {
        hasError: true,
        errorType: "corruption",
        errorMessage: `Workspace "${workspaceName}" appears to be corrupted or has missing files. This is likely due to external file system changes. You can create a new workspace to start again, or select the directory again if using OPFS.`,
        canRecover: diskType === "OpFsDirMountDisk",
        workspaceId,
        workspaceName,
      };
    }
  } else {
    return {
      hasError: true,
      errorType: "generic",
      errorMessage: `Failed to load workspace "${workspaceName}". There was an unrecoverable error during initialization. You can create a new workspace to start fresh.`,
      workspaceId,
      workspaceName,
    };
  }
}

export async function checkOpfsHandleRevocation(workspace: Workspace, _error: Error): Promise<boolean> {
  const disk = workspace.getDisk();
  if (disk instanceof OpFsDirMountDisk) {
    // Check if the disk needs directory selection (handle was revoked)
    const needsSelection = await disk.needsDirectorySelection();
    return needsSelection && !disk.hasDirectoryHandle();
  }
  return false;
}
