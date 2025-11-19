import { BuildStrategy } from "@/builder/builder-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { BuildDAO } from "@/data/BuildDAO";
import { Workspace } from "@/data/Workspace";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/BuildRunner";
import { AlertTriangle, CheckCircle, Loader, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { timeAgo } from "short-time-ago";

type BuildModalContextType = {
  openNew: (options: { build: BuildDAO }) => Promise<void>;
  close: () => void;
};

const BuildModalContext = createContext<BuildModalContextType | undefined>(undefined);

export function BuildModalProvider({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { openNew, close, cmdRef } = useBuildModalCmd();
  return (
    <BuildModalContext.Provider value={{ openNew, close }}>
      {children}
      <BuildModal cmdRef={cmdRef} currentWorkspace={currentWorkspace} />
    </BuildModalContext.Provider>
  );
}

export function useBuildModal() {
  const ctx = useContext(BuildModalContext);
  if (!ctx) throw new Error("useBuildModal must be used within a BuildModalProvider");
  return ctx;
}

export function useBuildModalCmd() {
  const cmdRef = useRef<{
    openNew: () => Promise<void>;
    close: () => void;
  }>({
    openNew: async () => {},
    close: () => {},
  });

  return {
    ...cmdRef.current,
    cmdRef,
  };
}

export function BuildModal({
  cmdRef,
  currentWorkspace,
}: {
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    openNew: () => void;
    close: () => void;
  }>;
}) {
  const [strategy, setStrategy] = useState<BuildStrategy>("freeform");
  const [isOpen, setIsOpen] = useState(false);
  const optionsRef = useRef<{
    currentWorkspace: Workspace;
    onCancel?: () => void;
    onComplete?: (buildDao?: BuildDAO) => void;
  } | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildRunner, setBuildRunner] = useState<BuildRunner>(NULL_BUILD_RUNNER);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const logs = useSyncExternalStore(buildRunner.onLog, buildRunner.getLogs);
  const buildCompleted = buildRunner ? buildRunner.isSuccessful : false;
  const handleOkay = () => setIsOpen(false);
  const openNew = useCallback(async () => {
    const build = BuildDAO.CreateNew({
      label: `Build ${new Date().toLocaleString()}`,
      workspaceId: currentWorkspace.guid,
      disk: currentWorkspace.getDisk(),
      logs: [],
    });
    setBuildRunner(
      BuildRunner.create({
        build,
        sourceDisk: currentWorkspace.getDisk(),
        strategy,
      })
    );
    setIsOpen(true);
  }, [currentWorkspace, strategy]);

  useEffect(() => {
    return () => {
      if (!isOpen) setBuildError(null);
    };
  }, [isOpen, strategy, optionsRef, setBuildError, currentWorkspace]);

  // useEffect(() => {
  //   bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [logs]);

  const handleBuild = async () => {
    if (!buildRunner) return;
    await buildRunner.execute();
    if (buildRunner.isSuccessful) {
      setBuildError(null);
      console.log("Build completed successfully");
    } else if (buildRunner.isFailed) {
      setBuildError("Build failed. Please check the logs for more details.");
    } else if (buildRunner.isCancelled) {
      setBuildError("Build was cancelled.");
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const handleCancel = useCallback(() => {
    buildRunner!.cancel();
    setIsOpen(false);
  }, [buildRunner]);

  const handleClose = useCallback(() => {
    if (buildRunner.isBuilding) return;
    setIsOpen(false);
  }, [buildRunner]);

  const handleFocusOutside = (e: Event) => {
    if (buildRunner.isBuilding) {
      e.preventDefault();
    }
  };

  useImperativeHandle(
    cmdRef,
    () => ({
      openNew,
      close: handleClose,
    }),
    [handleClose, openNew]
  );

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
              disabled={buildRunner.isBuilding || buildRunner.isCompleted}
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
              <Button
                onClick={handleBuild}
                disabled={buildRunner.isBuilding || buildRunner.isCompleted}
                className="flex items-center gap-2"
              >
                {buildRunner.isBuilding ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Building...
                  </>
                ) : (
                  "Start Build"
                )}
              </Button>
            )}

            {buildRunner.isBuilding && (
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
                  <CheckCircle size={20} className="text-success" />
                  <span className="font-semibold uppercase">build completed successfully</span>
                </div>
                <Button onClick={handleOkay} className="flex items-center gap-2">
                  Okay
                </Button>
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
                <Button onClick={handleOkay} variant="destructive" className="flex items-center gap-2">
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
                      <span className="text-muted-foreground shrink-0">[{timeAgo(log.timestamp)}]</span>
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
