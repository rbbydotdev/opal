import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { Workspace } from "@/lib/events/Workspace";
import { AlertTriangle, FolderX, HardDrive } from "lucide-react";
import { WorkspaceCorruptionState } from "./types";

interface WorkspaceCorruptionModalProps {
  errorState: WorkspaceCorruptionState | null;
}

export function WorkspaceCorruptionModal({ errorState }: WorkspaceCorruptionModalProps) {
  const handleRecoverOpfsHandle = async () => {
    if (!errorState) return;
    try {
      const workspaceDAO = await WorkspaceDAO.FetchFromName(errorState.workspaceName);
      const workspace = Workspace.FromDAO(workspaceDAO);
      await workspace.recoverDirectoryAccess();
      window.location.reload();
    } catch (error) {
      console.error(error);
      window.location.href = "/";
    }
  };

  if (!errorState?.hasError) return null;

  return (
    <AlertDialog open={true} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-md min-w-fit">
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
          <AlertDialogDescription className="mt-3 text-muted-foreground max-w-md">
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
