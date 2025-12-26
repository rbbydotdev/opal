import { useBuildPublisher } from "@/components/publish-modal/PubicationModalCmdContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceIcon } from "@/components/workspace/WorkspaceIcon";
import { NULL_BUILD } from "@/data/dao/BuildDAO";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRunner } from "@/hooks/useRunner";
import { BuildRunner } from "@/services/build/BuildRunner";
import { LogLine } from "@/types/RunnerTypes";
import { Workspace } from "@/workspace/Workspace";
import { AlertTriangle, Clock, Download, Loader, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export function BuildModal({
  cmdRef,
  currentWorkspace,
}: {
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    openNew: () => void;
    openEdit: (options: { buildId: string }) => void;
    close: () => void;
  }>;
}) {
  const [strategy, setStrategy] = useState<BuildStrategy>("freeform");
  const [isOpen, setIsOpen] = useState(false);
  const { storedValue: showTimestamps, setStoredValue: setShowTimestamps } = useLocalStorage(
    "BuildModal/showTimestamps",
    true,
    { initializeWithValue: true }
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { runner, execute, setRunner, logs } = useRunner(
    BuildRunner.Show({
      build: NULL_BUILD,
      workspace: currentWorkspace,
    }),
    []
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleOkay = () => setIsOpen(false);

  const handleOpenNew = useCallback(async () => {
    setIsOpen(true);
  }, []);

  const handleOpenEdit = useCallback(
    async ({ buildId }: { buildId: string }) => {
      setIsOpen(true);
      setRunner(await BuildRunner.Recall({ buildId, workspace: currentWorkspace }));
    },
    [currentWorkspace, setRunner]
  );

  const handleBuild = async () => {
    return execute(
      BuildRunner.Create({
        workspace: currentWorkspace,
        label: `Build ${new Date().toLocaleString()}`,
        strategy,
      })
    );
  };

  const handleCancel = useCallback(() => {
    runner.cancel();
    setIsOpen(false);
  }, [runner]);

  const { open: openPubModal } = useBuildPublisher();

  const handleClose = useCallback(() => {
    if (runner.isPending) return;
    setIsOpen(false);
  }, [runner.isPending]);

  const handleFocusOutside = useCallback(
    (e: Event) => {
      if (runner.isPending) {
        e.preventDefault();
      }
    },
    [runner.isPending]
  );
  const handleOpenPubModal = () => {
    handleClose();
    openPubModal({ build: runner.target });
  };

  useImperativeHandle(
    cmdRef,
    () => ({
      openNew: handleOpenNew,
      openEdit: handleOpenEdit,
      close: handleClose,
    }),
    [handleClose, handleOpenEdit, handleOpenNew]
  );

  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[70vh] top-[10vh] flex flex-col" onPointerDownOutside={handleFocusOutside}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {runner.isPending && <Loader size={16} className="animate-spin" />}
            Build Workspace
          </DialogTitle>
          <DialogDescription>Select a build strategy and publish your workspace to static HTML.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Strategy Selection */}
          <div className="space-y-2">
            <label htmlFor="strategy-select" className="text-sm font-medium">
              Build Strategy
            </label>
            <Select
              value={strategy}
              onValueChange={(value: BuildStrategy) => setStrategy(value)}
              disabled={runner.isCompleted}
            >
              <SelectTrigger id="strategy-select" className="min-h-14">
                <SelectValue placeholder="Select build strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freeform" className="_p-4">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">Freeform</span>
                    <span className="text-xs text-muted-foreground">
                      1:1 file mapping - templates and markdown to HTML
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="book" className="_p-4">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">Book</span>
                    <span className="text-xs text-muted-foreground">
                      Single page with table of contents for PDF printing
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="blog" className="_p-4">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">Blog</span>
                    <span className="text-xs text-muted-foreground">Blog index with individual post pages</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">{/* base url, for base tag */}</div>
          {/* Build Controls */}
          <div className="flex gap-2">
            {!runner.isCompleted && (
              <Button
                onClick={handleBuild}
                disabled={runner.isPending || runner.isCompleted}
                className="flex items-center gap-2"
              >
                {runner.isPending ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Building...
                  </>
                ) : (
                  "Start Build"
                )}
              </Button>
            )}

            {runner.isPending && (
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                <X size={16} />
                Cancel
              </Button>
            )}
          </div>

          {/* Build Success Indicator */}
          {runner.isCompleted && (
            <div className="border-2 border-success bg-card p-4 rounded-lg">
              <div className="flex items-center gap-2 font-mono text-success justify-between">
                <div className="flex items-center gap-4">
                  <WorkspaceIcon input={runner.target.guid} variant="round" />
                  <span className="font-semibold uppercase text-sm">build completed successfully</span>
                </div>
                <div className="flex gap-4 justify-center items-center">
                  <Button onClick={handleOkay} className="flex items-center gap-2" size="sm">
                    Okay
                  </Button>
                  <Button
                    onClick={handleOpenPubModal}
                    className="flex items-center gap-2"
                    variant="secondary"
                    size="sm"
                  >
                    <UploadCloud /> Publish
                  </Button>
                  <Button className="flex items-center gap-2" variant="secondary" size="sm" asChild>
                    <a href={runner.target.getDownloadBuildZipURL()}>
                      <Download /> Download
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Build Error Indicator */}
          {runner.error && (
            <div className="border-2 border-destructive bg-card p-4 rounded-lg">
              <div className="flex items-center gap-2 font-mono text-destructive justify-between">
                <div className="flex items-center gap-4">
                  <AlertTriangle size={20} className="text-destructive" />
                  <span className="font-semibold uppercase">build failed</span>
                </div>
                <Button onClick={handleOkay} variant="destructive" className="flex items-center gap-2">
                  Okay
                </Button>
              </div>
            </div>
          )}
          {/* Log Output */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-start mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTimestamps(!showTimestamps)}
                className="flex items-center gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Clock size={12} />
                {showTimestamps ? "Hide" : "Show"} timestamps
              </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
              <div className="font-mono text-sm space-y-1">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground italic">Build output will appear here...</div>
                ) : (
                  logs.map((log: LogLine, index: number) => (
                    <div
                      key={index}
                      className={`flex gap-2 ${log.type === "error" ? "text-destructive" : "text-foreground"}`}
                    >
                      {showTimestamps && (
                        <span className="text-muted-foreground shrink-0 text-2xs">
                          {`[${new Date(log.timestamp).toLocaleString()}]`}
                        </span>
                      )}
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
