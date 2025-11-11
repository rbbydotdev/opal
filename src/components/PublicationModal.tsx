import { BuildStrategy } from "@/builder/builder-types";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { BuildLabel } from "@/components/SidebarFileMenu/build-files-section/BuildLabel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO, NULL_BUILD } from "@/data/BuildDAO";
import { BuildLogLine } from "@/data/BuildRecord";
import { Workspace } from "@/data/Workspace";
import { BuildLog } from "@/hooks/useBuildLogs";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { BuildRunner, NULL_BUILD_RUNNER } from "@/services/BuildRunner";
import { AlertTriangle, CheckCircle, Loader, X } from "lucide-react";
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { timeAgo } from "short-time-ago";

export function usePublicationModalCmd() {
  const cmdRef = useRef<{
    openNew: ({ build }: { build: BuildDAO }) => Promise<void>;
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

export function PublicationModal({
  cmdRef,
  currentWorkspace,
}: {
  currentWorkspace: Workspace;
  cmdRef: React.ForwardedRef<{
    openNew: ({ build }: { build: BuildDAO }) => void;
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
  const { remoteAuths } = useRemoteAuths();
  const [remoteAuthGuid, setRemoteAuth] = useState<string>();
  const [buildError, setBuildError] = useState<string | null>(null);
  const [build, setBuild] = useState<BuildDAO>(NULL_BUILD);
  const [buildRunner, setBuildRunner] = useState<BuildRunner>(NULL_BUILD_RUNNER);
  const [logs, setLogs] = useState<BuildLog[]>([]);

  const buildCompleted = buildRunner ? buildRunner.isSuccessful : false;
  const handleOkay = () => setIsOpen(false);
  const log = useCallback((bl: BuildLogLine) => {
    setLogs((prev) => [...prev, bl]);
  }, []);
  const openNew = useCallback(async ({ build }: { build: BuildDAO }) => {
    setBuild(build);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    return () => {
      if (!isOpen) {
        setBuildError(null);
        setLogs([]);
      }
    };
  }, [isOpen, strategy, log, optionsRef, setBuildError, currentWorkspace]);

  const handleBuild = async () => {
    if (!buildRunner) return;
    await buildRunner.execute({
      log,
    });
    if (buildRunner.isSuccessful) {
      setBuildError(null);
      console.log("Build completed successfully");
    } else if (buildRunner.isFailed) {
      setBuildError("Build failed. Please check the logs for more details.");
    } else if (buildRunner.isCancelled) {
      setBuildError("Build was cancelled.");
    }
  };

  const handleCancel = useCallback(() => {
    buildRunner!.cancel({ log });
    setIsOpen(false);
  }, [buildRunner, log]);

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
            Publish Build
          </DialogTitle>
          <DialogDescription>Choose Publication Destination</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <BuildLabel build={build} className="border bg-card p-2 rounded-lg font-mono" />
          <div className="space-y-2">
            <label htmlFor="strategy-select" className="text-sm font-medium">
              Destination
            </label>
            <Select value={remoteAuthGuid} onValueChange={(value: string) => {}}>
              <SelectTrigger className="min-h-14">
                <SelectValue placeholder="Select Destination" />
              </SelectTrigger>
              <SelectContent>
                {remoteAuths.map((auth) => (
                  <SelectItem key={auth.guid} value={auth.guid}>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium flex items-center gap-2 capitalize">
                        <RemoteAuthSourceIconComponent type={auth.type} source={auth.source} size={16} />
                        {auth.name} - <span>{auth.type}</span> / <span> {auth.source}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Publish to {auth.source} hosting</span>
                    </div>
                  </SelectItem>
                ))}
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
                      <span className="text-muted-foreground shrink-0">[{timeAgo(log.timestamp)}]</span>
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
