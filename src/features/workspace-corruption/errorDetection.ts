import { OpFsDirMountDisk } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { ServiceUnavailableError } from "@/lib/errors";
import { WorkspaceCorruptionState, WorkspaceErrorType } from "./types";

/**
 * Checks if an error is due to OPFS handle revocation
 */
export async function checkOpfsHandleRevocation(workspace: Workspace, error: Error): Promise<boolean> {
  const disk = workspace.getDisk();
  if (disk instanceof OpFsDirMountDisk) {
    // Check if the disk needs directory selection (handle was revoked)
    const needsSelection = await disk.needsDirectorySelection();
    return needsSelection && !disk.hasDirectoryHandle();
  }
  return false;
}

/**
 * Analyzes a workspace initialization error and returns appropriate error state
 */
export async function analyzeWorkspaceError(
  workspaceName: string, 
  error: Error
): Promise<WorkspaceCorruptionState> {
  // Try to get workspace DAO to check disk type for OPFS handle revocation
  let workspaceForRecovery: Workspace | undefined;
  try {
    const workspaceDAO = await WorkspaceDAO.FetchFromName(workspaceName);
    workspaceForRecovery = workspaceDAO.toModel();
  } catch (e) {
    console.debug("Could not fetch workspace for recovery check:", e);
  }

  if (error instanceof ServiceUnavailableError) {
    // Check if this is an OPFS handle revocation issue
    let isOpfsRevoked = false;
    if (workspaceForRecovery) {
      isOpfsRevoked = await checkOpfsHandleRevocation(workspaceForRecovery, error);
    }

    if (isOpfsRevoked) {
      return {
        hasError: true,
        errorType: 'opfs_revoked',
        errorMessage: `Workspace "${workspaceName}" lost access to its directory. This happens when the browser revokes file system access or if the folder was moved. You can select the directory again or create a new workspace for the current location.`,
        workspaceName,
        canRecover: true,
        workspace: workspaceForRecovery
      };
    } else {
      return {
        hasError: true,
        errorType: 'corruption',
        errorMessage: `Workspace "${workspaceName}" appears to be corrupted or has missing files. This is likely due to external file system changes. You can create a new workspace to start fresh.`,
        workspaceName
      };
    }
  } else {
    return {
      hasError: true,
      errorType: 'generic',
      errorMessage: `Failed to load workspace "${workspaceName}". There was an unrecoverable error during initialization. You can create a new workspace to start fresh.`,
      workspaceName
    };
  }
}