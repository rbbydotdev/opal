// CODES as consts

export const WS_OK = "STATUS_OK" as const;
const WS_ERR_RECOVERABLE = "STATUS_CORRUPTED_DISK_RECOVERABLE" as const;
export const WS_ERR_NONRECOVERABLE = "STATUS_CORRUPTED_DISK_NON_RECOVERABLE" as const;
// Types derived from the consts

type WSStatusCodeOK = typeof WS_OK;
type WSErrRecoverable = typeof WS_ERR_RECOVERABLE;
type WSErrNonRecoverable = typeof WS_ERR_NONRECOVERABLE;
export type WorkspaceStatusCode = WSStatusCodeOK | WSErrRecoverable | WSErrNonRecoverable;

export const WSStatusLabels: Record<WorkspaceStatusCode, string> = {
  STATUS_OK: "OK",
  STATUS_CORRUPTED_DISK_RECOVERABLE: "Corrupted Disk (Recoverable)",
  STATUS_CORRUPTED_DISK_NON_RECOVERABLE: "Corrupted Disk (Non-Recoverable)",
};
