import { Workspace } from "@/Db/Workspace";

export type WorkspaceErrorType = 'corruption' | 'generic' | 'opfs_revoked';

export interface WorkspaceCorruptionState {
  hasError: boolean;
  errorType: WorkspaceErrorType | null;
  errorMessage: string;
  workspaceName: string;
  canRecover?: boolean;
  workspace?: Workspace;
}

export interface WorkspaceCorruptionActions {
  recoverOpfsHandle: () => Promise<void>;
  goHome: () => void;
  createNewWorkspace: () => void;
  clearError: () => void;
}