import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DefaultDiskType } from "@/data/disk/DiskDefaults";
import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { GithubImport } from "@/features/workspace-import/WorkspaceImport";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import Github from "@/icons/github.svg?react";
import { relPath } from "@/lib/paths2";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { Loader } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/_app/autoimport/github/$owner/$repo")({
  component: RouteComponent,
});

class ImportRunner {}

function useDiskFromRepo(fullRepoPath: string) {
  // const disk = useMemo(() => DiskFactoryByType(DefaultDiskType), []);
  // const files = await disk.Import(new GithubImport(relPath(fullRepoPath)));
  const [logs, setLogs] = useState<string[]>([]);
  const appendLog = useCallback((log: string) => {
    setLogs((prevLogs) => [...prevLogs, log]);
  }, []);
  useAsyncEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (signal) => {
      const disk = DiskFactoryByType(DefaultDiskType);
      const importer = new GithubImport(relPath(fullRepoPath));
      for await (const file of importer.fetchFiles(signal)) {
        // Here you would write the file to the disk
        // console.log(`Importing file: ${file.path}`);
        // await disk.writeFile(file.path, file.content);
        appendLog(`Imported file: ${file.path}`);
      }
      appendLog("Import complete");
    },
    [appendLog, fullRepoPath]
  );

  return { logs, disk };
}

function RouteComponent() {
  const navigate = useNavigate();
  const fullRepoRoute = useLocation().pathname.split("/autoimport/github/").slice(1)[0]!;
  const [owner, repo, ...rest] = fullRepoRoute.split("/");

  const [isValidRepo, setIsValidRepo] = useState<boolean | null>(null);

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
            <Loader className="h-6 w-6 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
          </div>
          <Button onClick={() => navigate({ to: "/" })}>Cancel</Button>
        </CardContent>
      </Card>
    </div>
  );
}
