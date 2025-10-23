// CODES as consts

export const WS_STATUS_OK = "STATUS_OK" as const;
export const WS_STATUS_CORRUPTED_DISK_RECOVERABLE = "STATUS_CORRUPTED_DISK_RECOVERABLE" as const;
export const WS_STATUS_CORRUPTED_DISK_NON_RECOVERABLE = "STATUS_CORRUPTED_DISK_NON_RECOVERABLE" as const;
// Types derived from the consts

export type WSStatusCodeOK = typeof WS_STATUS_OK;
export type WSStatusCodeCorruptedDiskRecoverable = typeof WS_STATUS_CORRUPTED_DISK_RECOVERABLE;
export type WSStatusCodeCorruptedDiskNonRecoverable = typeof WS_STATUS_CORRUPTED_DISK_NON_RECOVERABLE;
export type WorkspaceStatusCode =
  | WSStatusCodeOK
  | WSStatusCodeCorruptedDiskRecoverable
  | WSStatusCodeCorruptedDiskNonRecoverable;

export const WSStatusLabels: Record<WorkspaceStatusCode, string> = {
  STATUS_OK: "OK",
  STATUS_CORRUPTED_DISK_RECOVERABLE: "Corrupted Disk (Recoverable)",
  STATUS_CORRUPTED_DISK_NON_RECOVERABLE: "Corrupted Disk (Non-Recoverable)",
};
