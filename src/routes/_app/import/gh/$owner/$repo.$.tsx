import { PingDot } from "@/components/PingDot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRunner } from "@/hooks/useRunner";
import Github from "@/icons/github.svg?react";
import { useCountdown } from "@/lib/useCountdown";
import { cn } from "@/lib/utils";
import { getRepoInfo } from "@/services/import/getRepoInfo";
import { GitHubImportRunner } from "@/services/import/GitHubImportRunner";
import { LogLine } from "@/types/RunnerTypes";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRightFromSquare, CheckCircle, Loader, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_app/import/gh/$owner/$repo/$")({
  component: RouteComponent,
});

//this handle could be made generic later?
function useGithubImporter(fullRepoPath: string) {
  const [gotoPath, setGotoPath] = useState<string | null>(null);
  const { runner, execute, cancel, logs, error } = useRunner(
    () => GitHubImportRunner.Show({ fullRepoPath }),
    [fullRepoPath]
  );
  useEffect(() => {
    // if (fullRepoPath)
    void execute(GitHubImportRunner.Create({ fullRepoPath })).then((href) => {
      if (href) setGotoPath(href);
    });
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancel, execute]);

  return {
    logs,
    error,
    importRunner: runner,
    cancel,
    setConfirm: runner.setConfirm.bind(runner),
    successPath: gotoPath,
    type: runner.target.type,
    confirmImport: runner.target.confirmImport,
  };
}

function RouteComponent() {
  const { pathname } = useLocation();
  const importPath = useMemo(() => pathname.split("/import/gh/").pop() ?? "", [pathname]);
  return (
    <div className="flex items-center justify-center min-h-screen p-8 w-full">
      <ImporterCard importPath={importPath} />
    </div>
  );
}

function ImporterCard({ importPath }: { importPath: string }) {
  const navigate = useNavigate();
  const { logs, successPath, cancel, importRunner, confirmImport, setConfirm } = useGithubImporter(importPath);

  const isSuccess = importRunner.isSuccess;
  const isImporting = importRunner.isPending;
  const isCompleted = importRunner.isCompleted;
  const isFailed = importRunner.isFailed;

  const repoInfo = getRepoInfo(importPath);

  const {
    remaining,
    pauseCountdown,
    enabled: isCountingDown,
  } = useCountdown({
    seconds: 5,
    onComplete: () => {
      if (successPath) void navigate({ to: successPath });
    },
    enabled: Boolean(isSuccess && successPath),
  });
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center ">
        <div className="flex justify-center bg-card text-card-foreground rounded-md h-12 w-full items-center ">
          <div className="w-42 flex gap-2">
            <Github style={{ width: "24px", height: "24px" }} />
            <ArrowRight className="mx-2" />
            {isCompleted && isSuccess && <CheckCircle className="h-6 w-6 text-success mx-auto" />}
            {isCompleted && isFailed && <TriangleAlert className="h-6 w-6 text-destructive mx-auto" />}
            {isImporting && <Loader className="h-6 w-6 animate-spin mx-auto" />}
          </div>
        </div>
        <CardTitle className="text-lg">Importing from GitHub</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-8">
        <div className="space-y-4">
          <a
            target="_blank"
            href={`https://github.com/${repoInfo.owner}/${repoInfo.repo}`}
            className="font-medium bg-card-foreground/10 w-full rounded-lg py-2 block truncate px-4"
          >
            {repoInfo.owner}/{repoInfo.repo}
          </a>

          <ScrollArea className="font-mono text-xs space-y-1 flex-1 border rounded-md p-3 bg-muted/30 h-32 overflow-y-auto scrollbar-thin">
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
            <div ref={bottomRef} />
          </ScrollArea>
        </div>
        <div className="flex gap-4 justify-center items-center w-full">
          {confirmImport === "ask" && (
            <Button onClick={() => setConfirm("yes")} className="flex justify-center items-center gap-2">
              <PingDot />
              Confirm Import
            </Button>
          )}
          {isCountingDown ? (
            <>
              <Button onClick={() => navigate({ to: successPath! })}>Redirecting in {remaining}</Button>
              <Button variant="secondary" onClick={pauseCountdown}>
                Wait
              </Button>
            </>
          ) : (
            <Button
              className="px-12"
              onClick={() => {
                if (isImporting) cancel();
                void navigate({ to: "/" });
              }}
            >
              Cancel
            </Button>
          )}
          {isFailed && (
            <Button variant="secondary" asChild>
              <a href={`https://github.com/${repoInfo.owner}/${repoInfo.repo}`} target="_blank" rel="noreferrer">
                Github Repo
                <ArrowUpRightFromSquare />{" "}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
              <span className="font-mono break-all">/import/gh/rbbydotdev/foobar</span>
              <span>Owner / Repo only</span>
              <span className="font-mono">owner/repo</span>
            </div>
          </div>

          <div className="bg-card px-3 py-2 text-[11px]">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-mono break-all">/import/gh/rbbydotdev/foobar/master</span>
              <span>Owner / Repo / Branch</span>
              <span className="font-mono">owner/repo/branch</span>
            </div>
          </div>

          <div className="bg-background/40 px-3 py-2 text-[11px]">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-mono break-all">/import/gh/rbbydotdev/foobar/master/my-dir</span>
              <span>Owner / Repo / Branch / Path</span>
              <span className="font-mono">owner/repo/branch/path</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvalidRouteCard({ onClick, importPath }: { onClick: () => void; importPath: string }) {
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
          <Button onClick={onClick} className="w-full">
            OKAY
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BlockedCard({ proceed, reset }: { proceed: () => void; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8 w-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-lg flex items-center justify-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-500" />
            Navigation Warning
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            An import is currently in progress. Leaving this page will cancel the import.
          </p>
          <p className="text-sm font-medium">Are you sure you want to leave?</p>
          <div className="flex gap-3 justify-center">
            <Button variant="destructive" onClick={proceed}>
              Yes, Leave
            </Button>
            <Button onClick={reset}>Stay</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
