import { Builder, BuildStrategy } from "@/builder/builder";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO } from "@/Db/BuildDAO";
import { Disk } from "@/Db/Disk";
import { HideFs } from "@/Db/HideFs";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { absPath, relPath } from "@/lib/paths2";
import { Loader, X } from "lucide-react";
import React, { createContext, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";

type BuildModalContextType = {
  open: (options?: { 
    onCancel?: () => void; 
    onComplete?: (buildDao?: BuildDAO) => void;
    outputDisk?: Disk;
    sourceDisk?: Disk;
  }) => Promise<"cancelled" | "completed">;
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
    open: (options?: { 
      onCancel?: () => void; 
      onComplete?: (buildDao?: BuildDAO) => void;
      outputDisk?: Disk;
      sourceDisk?: Disk;
    }) => Promise<"cancelled" | "completed">;
    close: () => void;
  }>({
    open: async () => "completed" as const,
    close: () => {},
  });

  return {
    open: (options?: { 
      onCancel?: () => void; 
      onComplete?: (buildDao?: BuildDAO) => void;
      outputDisk?: Disk;
      sourceDisk?: Disk;
    }) => cmdRef.current.open(options),
    close: () => cmdRef.current.close(),
    cmdRef,
  };
}

interface BuildLog {
  timestamp: Date;
  message: string;
  type: "info" | "error";
}

export function BuildModal({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: (options?: { 
      onCancel?: () => void; 
      onComplete?: (buildDao?: BuildDAO) => void;
      outputDisk?: Disk;
      sourceDisk?: Disk;
    }) => Promise<"cancelled" | "completed">;
    close: () => void;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [strategy, setStrategy] = useState<BuildStrategy>("freeform");
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [buildAbortController, setBuildAbortController] = useState<AbortController | null>(null);

  const resolveRef = useRef<((value: "cancelled" | "completed") => void) | null>(null);
  const onCancelRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef<((buildDao?: BuildDAO) => void) | null>(null);
  const optionsRef = useRef<{ outputDisk?: Disk; sourceDisk?: Disk } | null>(null);
  const originalFsRef = useRef<any>(null);
  const sourceDiskRef = useRef<Disk | null>(null);

  // Prevent window close/navigation during build
  useEffect(() => {
    if (!isBuilding) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Build in progress. Are you sure you want to leave?";
      return "Build in progress. Are you sure you want to leave?";
    };

    const handlePopState = (e: PopStateEvent) => {
      if (isBuilding) {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Push state to prevent back navigation
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isBuilding]);

  const addLog = (message: string, type: "info" | "error" = "info") => {
    setLogs((prev) => [...prev, { timestamp: new Date(), message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleBuild = async () => {
    if (isBuilding) return;

    setIsBuilding(true);
    clearLogs();

    const abortController = new AbortController();
    setBuildAbortController(abortController);

    try {
      addLog(`Starting ${strategy} build...`);
      addLog("Filtering out special directories (SpecialDirs, node_modules, .next, etc.)");

      // Get disk instances from options
      const options = optionsRef.current;
      if (!options?.sourceDisk) {
        throw new Error("Source disk not provided");
      }

      // For now, use the same disk as both source and output if outputDisk not specified
      const baseDisk = options.sourceDisk;
      const outputDisk = options.outputDisk || options.sourceDisk;

      if (!baseDisk || !outputDisk) {
        throw new Error("Source or output disk not available");
      }

      // Create a filtered version of the source disk that hides special directories
      const hiddenPaths = [
        // Include all special directories (/.trash, /.storage, /.git, /.thumb)
        ...SpecialDirs.All,
        // Add common build/dev directories not covered by SpecialDirs
        relPath("node_modules"),
        relPath(".vscode"),
        relPath(".next"),
        relPath("build"),
        relPath("dist"),
        relPath("coverage"),
        relPath(".cache"),
        relPath(".env"),
        relPath(".vercel"),
        relPath("playwright-report"),
        relPath(".tanstack"),
        relPath(".github"),
        relPath(".DS_Store"),
        relPath("*.log"),
      ];

      // Wrap the source disk's filesystem with HideFs to filter out special directories
      const hideFs = new HideFs(baseDisk.fs, hiddenPaths);
      
      // Store original fs for restoration
      originalFsRef.current = baseDisk.fs;
      sourceDiskRef.current = baseDisk;
      
      // Temporarily replace the fs with the filtered version
      Object.defineProperty(baseDisk, 'fs', {
        get: () => hideFs,
        configurable: true
      });
      
      const sourceDisk = baseDisk;

      const builder = new Builder({
        strategy,
        sourceDisk,
        outputDisk,
        sourcePath: absPath("/"), // Replace with actual source path
        outputPath: absPath("/build"), // Replace with actual output path
        onLog: (message) => addLog(message),
        onError: (message) => addLog(message, "error"),
      });

      // Check for abort before starting
      if (abortController.signal.aborted) {
        addLog("Build cancelled", "error");
        return;
      }

      await builder.build();

      if (!abortController.signal.aborted) {
        addLog("Build completed successfully!");
        
        // Create and save build record
        const buildLabel = `${strategy.charAt(0).toUpperCase() + strategy.slice(1)} Build - ${new Date().toLocaleString()}`;
        const buildDao = await BuildDAO.CreateNew(buildLabel, baseDisk.guid);
        await buildDao.save();
        
        addLog(`Build saved with ID: ${buildDao.guid}`);
        
        // Restore original filesystem
        if (originalFsRef.current && sourceDiskRef.current) {
          Object.defineProperty(sourceDiskRef.current, 'fs', {
            get: () => originalFsRef.current,
            configurable: true
          });
        }
        
        setIsBuilding(false);
        setBuildAbortController(null);

        onCompleteRef.current?.(buildDao);
        resolveRef.current?.("completed");
        setIsOpen(false);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`Build failed: ${errorMessage}`, "error");
        
        // Restore original filesystem on error
        if (originalFsRef.current && sourceDiskRef.current) {
          Object.defineProperty(sourceDiskRef.current, 'fs', {
            get: () => originalFsRef.current,
            configurable: true
          });
        }
        
        setIsBuilding(false);
        setBuildAbortController(null);
      }
    }
  };

  const handleCancel = () => {
    if (isBuilding && buildAbortController) {
      buildAbortController.abort();
      setBuildAbortController(null);
      addLog("Build cancelled by user", "error");
      
      // Restore original filesystem if it was modified
      if (originalFsRef.current && sourceDiskRef.current) {
        Object.defineProperty(sourceDiskRef.current, 'fs', {
          get: () => originalFsRef.current,
          configurable: true
        });
      }
    }

    setIsBuilding(false);
    onCancelRef.current?.();
    resolveRef.current?.("cancelled");
    setIsOpen(false);
  };

  const handleClose = () => {
    if (isBuilding) {
      // Don't allow closing during build
      return;
    }
    handleCancel();
  };

  useImperativeHandle(
    cmdRef,
    () => ({
      open: async (options?: { 
        onCancel?: () => void; 
        onComplete?: (buildDao?: BuildDAO) => void;
        outputDisk?: Disk;
        sourceDisk?: Disk;
      }) => {
        return new Promise<"cancelled" | "completed">((resolve) => {
          resolveRef.current = resolve;
          onCancelRef.current = options?.onCancel || null;
          onCompleteRef.current = options?.onComplete || null;
          optionsRef.current = options ? { outputDisk: options.outputDisk, sourceDisk: options.sourceDisk } : null;

          setIsOpen(true);
          clearLogs();
          setStrategy("freeform");
        });
      },
      close: handleClose,
    }),
    [isBuilding]
  );

  return (
    <Dialog open={isOpen} onOpenChange={isBuilding ? undefined : handleClose}>
      <DialogContent
        className="max-w-2xl h-[80vh] flex flex-col"
        onPointerDownOutside={isBuilding ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBuilding && <Loader size={16} className="animate-spin" />}
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
            <Select value={strategy} onValueChange={(value: BuildStrategy) => setStrategy(value)} disabled={isBuilding}>
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
            <Button onClick={handleBuild} disabled={isBuilding} className="flex items-center gap-2">
              {isBuilding ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Building...
                </>
              ) : (
                "Start Build"
              )}
            </Button>

            {isBuilding && (
              <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                <X size={16} />
                Cancel
              </Button>
            )}
          </div>

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
