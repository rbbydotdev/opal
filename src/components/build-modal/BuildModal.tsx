import { useBuildPublisher } from "@/components/publish-modal/PubicationModalCmdContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceIcon } from "@/components/workspace/WorkspaceIcon";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import { useBuildRunner } from "@/services/useBuildRunner";
import { Workspace } from "@/workspace/Workspace";
import { AlertTriangle, Loader, UploadCloud, X } from "lucide-react";
import { useCallback, useImperativeHandle, useRef, useState } from "react";
import { timeAgo } from "short-time-ago";

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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const {
    buildRunner,
    logs,
    buildCompleted,
    isBuilding,
    runBuild,
    cancelBuild,
    openNew,
    openEdit,
    buildError,
    clearError,
  } = useBuildRunner(currentWorkspace);

  const handleOkay = () => setIsOpen(false);

  const handleOpenNew = useCallback(async () => {
    openNew(strategy);
    setIsOpen(true);
  }, [strategy, openNew]);

  const handleOpenEdit = useCallback(
    async ({ buildId }: { buildId: string }) => {
      await openEdit(buildId);
      setIsOpen(true);
    },
    [openEdit]
  );

  const handleBuild = async () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    return runBuild();
  };

  const handleCancel = useCallback(() => {
    cancelBuild();
    setIsOpen(false);
  }, [cancelBuild]);

  const { open: openPubModal } = useBuildPublisher();

  const handleClose = useCallback(() => {
    if (isBuilding) return;
    setIsOpen(false);
  }, [isBuilding]);

  const handleFocusOutside = (e: Event) => {
    if (isBuilding) {
      e.preventDefault();
    }
  };
  const handleOpenPubModal = () => {
    handleClose();
    openPubModal({ build: buildRunner.build });
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
            {buildRunner.isBuilding && <Loader size={16} className="animate-spin" />}
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
              disabled={isBuilding || buildCompleted}
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

          {/* Build Controls */}
          <div className="flex gap-2">
            {!buildCompleted && (
              <Button onClick={handleBuild} disabled={isBuilding || buildCompleted} className="flex items-center gap-2">
                {isBuilding ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Building...
                  </>
                ) : (
                  "Start Build"
                )}
              </Button>
            )}

            {isBuilding && (
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                <X size={16} />
                Cancel
              </Button>
            )}
          </div>

          {/* Build Success Indicator */}
          {buildCompleted && (
            <div className="border-2 border-success bg-card p-4 rounded-lg">
              <div className="flex items-center gap-2 font-mono text-success justify-between">
                <div className="flex items-center gap-4">
                  <WorkspaceIcon input={buildRunner.build.guid} variant="round" />
                  <span className="font-semibold uppercase">build completed successfully</span>
                </div>
                <div className="flex gap-4 justify-center items-center">
                  <Button onClick={handleOkay} className="flex items-center gap-2">
                    Okay
                  </Button>
                  <Button onClick={handleOpenPubModal} className="flex items-center gap-2" variant="secondary">
                    <UploadCloud /> Publish
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Build Error Indicator */}
          {buildError && (
            <div className="border-2 border-destructive bg-card p-4 rounded-lg">
              <div className="flex items-center gap-2 font-mono text-destructive justify-between">
                <div className="flex items-center gap-4">
                  <AlertTriangle size={20} className="text-destructive" />
                  <span className="font-semibold uppercase">build failed</span>
                </div>
                <Button onClick={clearError} variant="destructive" className="flex items-center gap-2">
                  Okay
                </Button>
              </div>
            </div>
          )}
          {/* Log Output */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-sm font-medium mb-2">Build Output</label>
            <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
              <div className="font-mono text-sm space-y-1">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground italic">Build output will appear here...</div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 ${log.type === "error" ? "text-destructive" : "text-foreground"}`}
                    >
                      <span className="text-muted-foreground shrink-0">[{timeAgo(new Date(log.timestamp))}]</span>
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
