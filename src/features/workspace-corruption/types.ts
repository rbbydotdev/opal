export type WorkspaceErrorType = "corruption" | "generic" | "opfs_revoked";

export interface WorkspaceCorruptionState {
  hasError: boolean;
  errorType: WorkspaceErrorType | null;
  errorMessage: string;
  workspaceName: string;
  canRecover?: boolean;
  workspaceId?: string;
}

interface WorkspaceCorruptionActions {
  recoverOpfsHandle: () => Promise<void>;
  goHome: () => void;
  createNewWorkspace: () => void;
  clearError: () => void;
}
