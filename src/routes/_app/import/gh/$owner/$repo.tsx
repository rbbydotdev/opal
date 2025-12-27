import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRunner } from "@/hooks/useRunner";
import Github from "@/icons/github.svg?react";
import { cn } from "@/lib/utils";
import { ImportRunner, NULL_IMPORT_RUNNER } from "@/services/import/ImportRunner";
import { LogLine } from "@/types/RunnerTypes";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/import/gh/$owner/$repo")({
  component: RouteComponent,
});

function useDiskFromRepo(fullRepoPath: string) {
  const {
    runner: importRunner,
    execute,
    cancel,
    logs,
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
    importRunner,
    cancel,
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
  const { logs, cancel, isFailed, isImporting, isCompleted } = useDiskFromRepo(fullRepoRoute);

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
          <div className="flex justify-center mb-4">
            <div className="bg-card text-card-foreground p-2 rounded-md w-12 h-12 flex items-center justify-center">
              <Github style={{ width: "24px", height: "24px" }} />
            </div>
          </div>
          <CardTitle className="text-lg">Importing from GitHub</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-8">
          <div className="space-y-2">
            <p className="font-medium">
              {owner}/{repo}
            </p>
            {isImporting && <Loader className="h-6 w-6 animate-spin mx-auto" />}
            <p className="text-sm text-muted-foreground">
              {isFailed
                ? "Import failed. Please try again."
                : isCompleted
                  ? "Import completed"
                  : isImporting
                    ? "Importing files..."
                    : "Setting up your workspace..."}
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
            {isCompleted ? "Done" : "Cancel"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
