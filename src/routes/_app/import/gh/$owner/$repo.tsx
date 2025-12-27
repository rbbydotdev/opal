import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRunner } from "@/hooks/useRunner";
import Github from "@/icons/github.svg?react";
import { cn } from "@/lib/utils";
import { ImportRunner, NULL_IMPORT_RUNNER } from "@/services/import/ImportRunner";
import { LogLine } from "@/types/RunnerTypes";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Loader, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/import/gh/$owner/$repo")({
  component: RouteComponent,
});

function getImportStatusText(
  isFailed: boolean,
  isCompleted: boolean,
  isImporting: boolean,
  error: string | null
): string {
  if (isFailed) {
    if (error) {
      return error;
    }
    return "Import failed. Please try again.";
  }

  if (isCompleted) {
    return "Import completed";
  }

  if (isImporting) {
    return "Importing files...";
  }

  return "Setting up your workspace...";
}

function useDiskFromRepo(fullRepoPath: string) {
  const {
    runner: importRunner,
    execute,
    cancel,
    logs,
    error,
  } = useRunner(() => {
    return fullRepoPath ? ImportRunner.Create({ fullRepoPath }) : NULL_IMPORT_RUNNER;
  }, [fullRepoPath]);

  // Auto-start the import when fullRepoPath changes
  useEffect(() => {
    if (
      fullRepoPath &&
      importRunner &&
      importRunner !== NULL_IMPORT_RUNNER &&
      !importRunner.isPending &&
      !importRunner.isCompleted
    ) {
      void execute(ImportRunner.Create({ fullRepoPath }));
    }
  }, [execute, fullRepoPath, importRunner]);

  return {
    logs,
    error,
    importRunner,
    cancel,
    isSuccess: importRunner.isSuccess,
    isImporting: importRunner.isPending,
    isCompleted: importRunner.isCompleted,
    isFailed: importRunner.isFailed,
  };
}

function RouteComponent() {
  const navigate = useNavigate();
  const fullRepoRoute = useLocation().pathname.split("/import/gh/").slice(1)[0] ?? "unknown/unknown/unknown";
  const [owner, repo, ...rest] = fullRepoRoute.split("/");

  const [isValidRepo, setIsValidRepo] = useState<boolean | null>(null);
  const { logs, cancel, isFailed, isImporting, isSuccess, isCompleted, error } = useDiskFromRepo(fullRepoRoute);

  useEffect(() => {
    if (!owner || !repo) {
      setIsValidRepo(false);
      return;
    }

    // Simple validation: just check that we have non-empty strings
    setIsValidRepo(owner.trim().length > 0 && repo.trim().length > 0);
  }, [owner, repo]);

  const handleOkayClick = () => {
    void navigate({ to: "/" });
  };

  if (isValidRepo === null) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 w-full">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Processing import...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidRepo) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 w-full">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {/* {isCompleted && isFailed && <TriangleAlert className="h-6 w-6 text-destructive mx-auto" />} */}
            <CardTitle className="text-lg">Unknown Import</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {owner && repo ? `"${owner}/${repo}" is not a valid repository format.` : "Invalid repository format."}
            </p>
            <p className="text-xs text-muted-foreground">Expected format: owner/repo</p>
            <Button onClick={handleOkayClick} className="w-full">
              OKAY
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-8 w-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center bg-card text-card-foreground rounded-md h-12 w-full items-center ">
            <Github style={{ width: "24px", height: "24px" }} />
          </div>
          <CardTitle className="text-lg">Importing from GitHub</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-8">
          <div className="space-y-2">
            {isCompleted && isSuccess && <CheckCircle className="h-6 w-6 text-success mx-auto" />}
            {isCompleted && isFailed && <TriangleAlert className="h-6 w-6 text-destructive mx-auto" />}
            <p className="font-medium">
              {owner}/{repo}
            </p>
            {isImporting && <Loader className="h-6 w-6 animate-spin mx-auto" />}
            <p className="text-sm text-muted-foreground">
              {getImportStatusText(isFailed, isCompleted, isImporting, error)}
            </p>

            <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
              <div className="font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground italic">importing...</div>
                ) : (
                  logs.map((log: LogLine, index: number) => (
                    <div
                      key={index}
                      className={cn(
                        "text-left whitespace-break-spaces gap-2",
                        log.type === "error" ? "text-destructive" : "text-foreground"
                      )}
                    >
                      <span className="break-words">{log.message}</span>
                    </div>
                  ))
                )}
                <div />
              </div>
            </ScrollArea>
          </div>
          <Button
            onClick={() => {
              if (isImporting) {
                cancel();
              }
              void navigate({ to: "/" });
            }}
          >
            {isCompleted ? "OK" : "Cancel"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
