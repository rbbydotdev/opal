import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OpFsDirMountDisk } from "@/Db/Disk";
import { AlertTriangle, FolderX, HardDrive } from "lucide-react";
import { WorkspaceCorruptionState } from "./types";

interface WorkspaceCorruptionModalProps {
  errorState: WorkspaceCorruptionState | null;
  onClearError: () => void;
}

export function WorkspaceCorruptionModal({ errorState, onClearError }: WorkspaceCorruptionModalProps) {
  const handleRecoverOpfsHandle = async () => {
    if (!errorState?.workspace) return;

    try {
      const disk = errorState.workspace.getDisk();
      if (disk instanceof OpFsDirMountDisk) {
        await disk.selectDirectory();
        // Reload to reinitialize the workspace
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to recover OPFS handle:", error);
      // Fall back to going home if recovery fails
      window.location.href = "/";
    }
  };

  if (!errorState?.hasError) return null;

  return (
    <AlertDialog open={true} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              {errorState.errorType === "opfs_revoked" ? (
                <FolderX className="h-5 w-5 text-destructive" />
              ) : errorState.errorType === "corruption" ? (
                <HardDrive className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
            <AlertDialogTitle className="text-destructive">
              {errorState.errorType === "opfs_revoked"
                ? "Directory Access Lost"
                : errorState.errorType === "corruption"
                  ? "Workspace Corrupted"
                  : "Workspace Loading Failed"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-3 text-muted-foreground">
            {errorState.errorMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-2">
          {errorState.canRecover ? (
            <>
              <AlertDialogAction
                onClick={() => (window.location.href = "/")}
                className="order-3 sm:order-1 border border-input hover:bg-accent hover:text-accent-foreground"
              >
                Go Home
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => (window.location.href = "/newWorkspace")}
                className="order-2 sm:order-2 border border-input hover:bg-accent hover:text-accent-foreground"
              >
                Create New Workspace
              </AlertDialogAction>
              <AlertDialogAction
                onClick={handleRecoverOpfsHandle}
                className="bg-destructive hover:bg-destructive/90 order-1 sm:order-3"
              >
                Select Directory
              </AlertDialogAction>
            </>
          ) : (
            <>
              <AlertDialogAction
                onClick={() => (window.location.href = "/")}
                className="order-2 border border-input hover:bg-accent hover:text-accent-foreground"
              >
                Go Home
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => (window.location.href = "/newWorkspace")}
                className="bg-destructive hover:bg-destructive/90 order-1"
              >
                Create New Workspace
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
