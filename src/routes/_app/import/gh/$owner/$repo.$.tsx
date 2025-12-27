import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRunner } from "@/hooks/useRunner";
import Github from "@/icons/github.svg?react";
import { stripLeadingSlash, stripTrailingSlash } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { ImportRunner, NULL_IMPORT_RUNNER } from "@/services/import/ImportRunner";
import { LogLine } from "@/types/RunnerTypes";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Loader, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

export const Route = createFileRoute("/_app/import/gh/$owner/$repo/$")({
  loader: async ({ params }) => {
    const fullRepoPath = stripTrailingSlash(`${params.owner}/${params.repo}/${params._splat}`);
    console.log("Import Route Loader:", { fullRepoPath });
    // const runner = ImportRunner.Create({ fullRepoPath });

    // Start your import or async job now and await initial info/logs if needed

    return {
      fullRepoPath,
      runner: {},
    };
  },
  onEnter: async ({ context }) => {
    console.log(context);
    return {
      status: "ok",
    };
  },
  onLeave: async ({ context }) => {
    console.log(context);
  },
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

function useImporter(fullRepoPath: string) {
  const { runner: importRunner, execute, cancel, logs, error } = useRunner(() => NULL_IMPORT_RUNNER, [fullRepoPath]);

  const autoImportStart = useRef(false);

  // Auto-start the import when fullRepoPath changes
  useEffect(() => {
    if (!autoImportStart.current) {
      autoImportStart.current = true;
      void execute(ImportRunner.Create({ fullRepoPath }));
    }

    return () => cancel();
  }, [cancel, execute, fullRepoPath]);

  const [owner, repo, branch = "main", dir = "/"] = stripLeadingSlash(fullRepoPath).split("/");

  return {
    logs,
    error,
    importRunner,
    cancel,
    repoInfo: { owner, repo, branch, dir },
    isSuccess: importRunner.isSuccess,
    isValidRepoRoute: true,
    isImporting: importRunner.isPending,
    isCompleted: importRunner.isCompleted,
    isFailed: importRunner.isFailed,
  };
}

function RouteComponent() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const importPath = useMemo(() => pathname.split("/import/gh/")[1] ?? "", [pathname]);

  const { fullRepoPath, runner } = Route.useLoaderData();
  const { logs, cancel, repoInfo, isValidRepoRoute, isFailed, isImporting, isSuccess, isCompleted, error } =
    useImporter(importPath);

  const handleOkayClick = () => {
    void navigate({ to: "/" });
  };
  const location = useLocation();

  const mountRef = useRef(false);
  useEffect(() => {
    if (mountRef.current) {
      return () => {
        console.log("Unmounted route:", location.pathname);
      };
    }
  }, [location.pathname]); // runs once on unmount

  if (!mountRef.current) {
    console.log("Mounted route:", location.pathname);
    mountRef.current = true;
  }

  if (isValidRepoRoute) {
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

  if (!isValidRepoRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 w-full">
        <Card>
          <CardHeader className="text-center">
            {/* {isCompleted && isFailed && <TriangleAlert className="h-6 w-6 text-destructive mx-auto" />} */}
            <CardTitle className="text-lg">Unknown Import</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">{`${importPath} is not a valid repository format.`}</div>
            <ExampleTableFormat />
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
              {repoInfo.owner}/{repoInfo.repo}
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

function ExampleTableFormat() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Expected formats:</p>
      <div className="rounded-md border overflow-hidden text-left">
        <div className="bg-card px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <div className="grid grid-cols-3 gap-2">
            <span>Example</span>
            <span>Meaning</span>
            <span>Pattern</span>
          </div>
        </div>

        <div className="divide-y">
          <div className="bg-background/40 px-3 py-2 text-[11px]">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-mono break-all">rbbydotdev/foobar</span>
              <span>Owner / Repo only</span>
              <span className="font-mono">owner/repo</span>
            </div>
          </div>

          <div className="bg-card px-3 py-2 text-[11px]">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-mono break-all">rbbydotdev/foobar/master</span>
              <span>Owner / Repo / Branch</span>
              <span className="font-mono">owner/repo/branch</span>
            </div>
          </div>

          <div className="bg-background/40 px-3 py-2 text-[11px]">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-mono break-all">rbbydotdev/foobar/master/my-dir</span>
              <span>Owner / Repo / Branch / Path</span>
              <span className="font-mono">owner/repo/branch/path</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
