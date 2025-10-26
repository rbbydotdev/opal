import { BuildStrategy } from "@/builder/builder-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { BuildDAO } from "@/Db/BuildDAO";
import { Workspace } from "@/Db/Workspace";
import { useBuildExecution } from "@/hooks/useBuildExecution";
import { useBuildLogs } from "@/hooks/useBuildLogs";
import { useBuildModalState } from "@/hooks/useBuildModalState";
import { BuildService } from "@/services/BuildService";
import { AlertTriangle, CheckCircle, Loader, X } from "lucide-react";
import React, { createContext, useCallback, useContext, useEffect, useImperativeHandle, useRef } from "react";

type BuildModalOptionsType = {
  onCancel?: () => void;
  onComplete?: (buildDao?: BuildDAO) => void;
  currentWorkspace: Workspace;
};

type BuildModalContextType = {
  open: (options: BuildModalOptionsType) => Promise<"cancelled" | "completed">;
  close: () => void;
};

const BuildModalContext = createContext<BuildModalContextType | undefined>(undefined);

export function BuildModalProvider({ children }: { children: React.ReactNode }) {
  const { open, close, cmdRef } = useBuildModalCmd();

  return (
    <BuildModalContext.Provider value={{ open, close }}>
      {children}
      <BuildModal cmdRef={cmdRef} />
    </BuildModalContext.Provider>
  );
}

export function useBuildModal() {
  const ctx = useContext(BuildModalContext);
  if (!ctx) throw new Error("useBuildModal must be used within a BuildModalProvider");
  return ctx;
}

function useBuildModalCmd() {
  const cmdRef = useRef<{
    open: (options: BuildModalOptionsType) => Promise<"cancelled" | "completed">;
    close: () => void;
  }>({
    open: async () => "completed" as const,
    close: () => {},
  });

  return {
    open: (options: BuildModalOptionsType) => cmdRef.current.open(options),
    close: () => cmdRef.current.close(),
    cmdRef,
  };
}

export function BuildModal({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: (options: BuildModalOptionsType) => Promise<"cancelled" | "completed">;
    close: () => void;
  }>;
}) {
  const {
    isOpen,
    strategy,
    buildCompleted,
    buildError,
    optionsRef,
    setStrategy,
    setBuildError,
    openModal,
    closeModal,
    completeModal,
    handleOkay,
  } = useBuildModalState();
  const buildExecution = useBuildExecution();
  const { log, logs, errorLog, clearLogs, formatTimestamp } = useBuildLogs();
  const { name } = useWorkspaceRoute();
  const buildServiceRef = useRef({} as BuildService);
  useEffect(() => {
    buildServiceRef.current = new BuildService({
      onLog: log,
      onError: errorLog,
      workspaceName: name!,
      strategy,
    });
    return () => {
      buildServiceRef?.current?.tearDown();
    };
  }, [errorLog, log, strategy, name]);

  const handleBuild = async () => {
    if (!optionsRef.current) throw new Error("Options not provided");

    if (buildExecution.isBuilding) return;

    clearLogs();
    const abortController = buildExecution.startBuild();

    const result = await buildServiceRef.current.executeBuild({
      strategy: strategy,
      workspaceId: name!,
      onLog: log,
      onError: errorLog,
      abortSignal: abortController.signal,
    });

    buildExecution.finishBuild();

    if (result.success) {
      completeModal(result.buildDao);
    } else if (result.error) {
      setBuildError(result.error);
    }
  };

  const handleCancel = useCallback(() => {
    if (buildExecution.isBuilding) {
      buildExecution.cancelBuild();
      log("Build cancelled by user", "error");
    }

    closeModal();
  }, [buildExecution, closeModal, log]);

  const handleClose = useCallback(() => {
    if (buildExecution.isBuilding) {
      return;
    }
    handleCancel();
  }, [handleCancel, buildExecution.isBuilding]);

  useImperativeHandle(
    cmdRef,
    () => ({
      open: openModal,
      close: handleClose,
    }),
    [openModal, handleClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={buildExecution.isBuilding ? undefined : handleClose}>
      <DialogContent
        className="max-w-2xl h-[80vh] flex flex-col"
        onPointerDownOutside={buildExecution.isBuilding ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {buildExecution.isBuilding && <Loader size={16} className="animate-spin" />}
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
              disabled={buildExecution.isBuilding}
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
              <Button onClick={handleBuild} disabled={buildExecution.isBuilding} className="flex items-center gap-2">
                {buildExecution.isBuilding ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Building...
                  </>
                ) : (
                  "Start Build"
                )}
              </Button>
            )}

            {buildExecution.isBuilding && (
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
                  <span className="font-semibold">BUILD COMPLETED SUCCESSFULLY</span>
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
                  <span className="font-semibold">BUILD FAILED</span>
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
                      <span className="text-muted-foreground shrink-0">[{formatTimestamp(log.timestamp)}]</span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
