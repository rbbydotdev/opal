import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { Workspace } from "@/data/Workspace";
import { WorkspaceDAO } from "@/data/WorkspaceDAO";
import { ServiceUnavailableError } from "@/lib/errors";
import { useState } from "react";
import { WorkspaceCorruptionState, WorkspaceErrorType } from "./types";

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
  let workspaceForRecovery: Workspace | null = null;
  let workspaceId: string | null = "NULL";
  try {
    const workspaceDAO = await WorkspaceDAO.FetchFromName(workspaceName).catch(() => null);
    workspaceId = workspaceDAO?.guid ?? workspaceId;
    workspaceForRecovery = workspaceDAO ? Workspace.FromDAO(workspaceDAO) : null;
  } catch (e) {
    console.debug("Could not fetch workspace for recovery check:", e);
  }

  const isServiceUnavailable = error instanceof ServiceUnavailableError;
  const isOpfsRevoked =
    isServiceUnavailable && workspaceForRecovery ? await checkOpfsHandleRevocation(workspaceForRecovery, error) : false;
  const diskType = workspaceForRecovery?.getDisk().type ?? null;

  const opfsMessage = `Workspace "${workspaceName}" lost access to its directory. This happens when the browser revokes file system access or if the folder was moved. You can select the directory again or create a new workspace for the current location.`;
  const corruptionMessage = `Workspace "${workspaceName}" appears to be corrupted or has missing files. This is likely due to external file system changes. You can create a new workspace to start again, or select the directory again if using OPFS.`;
  const genericMessage = `Failed to load workspace "${workspaceName}". There was an unrecoverable error during initialization. You can create a new workspace to start fresh.`;

  let errorType: WorkspaceErrorType = "generic";
  if (isServiceUnavailable) {
    if (isOpfsRevoked) errorType = "opfs_revoked";
    else errorType = "corruption";
  }
  let errorMessage: string = genericMessage;
  if (isServiceUnavailable) {
    errorMessage = isOpfsRevoked ? opfsMessage : corruptionMessage;
  }
  let canRecover: boolean = false;
  if (isServiceUnavailable) {
    canRecover = isOpfsRevoked ? true : diskType === "OpFsDirMountDisk";
  }

  return {
    hasError: true,
    errorType,
    errorMessage,
    workspaceName,
    workspaceId,
    canRecover,
  };
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
