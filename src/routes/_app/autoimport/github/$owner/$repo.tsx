import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DefaultDiskType } from "@/data/disk/DiskDefaults";
import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { useRunner } from "@/hooks/useRunner";
import { ImportRunner, NULL_IMPORT_RUNNER } from "@/services/import/ImportRunner";
import { RunnerLogLine } from "@/types/RunnerTypes";
import Github from "@/icons/github.svg?react";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { Loader } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";

export const Route = createFileRoute("/_app/autoimport/github/$owner/$repo")({
  component: RouteComponent,
});

function useDiskFromRepo(fullRepoPath: string) {
  const disk = useMemo(() => DiskFactoryByType(DefaultDiskType), []);

  const importRunner = useRunner(() => {
    return fullRepoPath ? ImportRunner.create({ disk, fullRepoPath }) : NULL_IMPORT_RUNNER;
  }, [fullRepoPath, disk]);

  // Auto-start the import when runner is created
  useEffect(() => {
    if (importRunner && importRunner !== NULL_IMPORT_RUNNER && !importRunner.running && !importRunner.completed) {
      importRunner.execute();
    }
  }, [importRunner]);

  return {
    logs: importRunner.logs,
    disk,
    importRunner,
    isImporting: importRunner.running,
    isCompleted: importRunner.completed
  };
}

function RouteComponent() {
  const navigate = useNavigate();
  const fullRepoRoute = useLocation().pathname.split("/autoimport/github/").slice(1)[0]!;
  const [owner, repo, ...rest] = fullRepoRoute.split("/");

  const [isValidRepo, setIsValidRepo] = useState<boolean | null>(null);
  const { logs, isImporting, isCompleted } = useDiskFromRepo(fullRepoRoute);

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
            <div className="dark:bg-black bg-white dark:text-white text-black p-2 rounded-md w-12 h-12 flex items-center justify-center">
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
              {isCompleted ? "Import completed!" : isImporting ? "Importing files..." : "Setting up your workspace..."}
            </p>
            {logs.length > 0 && (
              <div className="text-left max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
                {logs.slice(-5).map((log: RunnerLogLine, i: number) => (
                  <div key={i} className={log.type === "error" ? "text-red-600" : "text-gray-600"}>
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => navigate({ to: "/" })}>{isCompleted ? "Done" : "Cancel"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
