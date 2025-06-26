import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { AbsPath } from "@/lib/paths2";
import { Delete, Trash2, Undo } from "lucide-react";
import React from "react";

export const TrashBanner = ({ filePath }: { filePath: AbsPath }) => {
  const { currentWorkspace } = useWorkspaceContext();
  const untrashFile = React.useCallback(async () => {
    return currentWorkspace.untrashSingle(filePath);
  }, [currentWorkspace, filePath]);
  const removeFile = React.useCallback(async () => {
    return currentWorkspace.removeSingle(filePath);
  }, [currentWorkspace, filePath]);
  // drop-shadow-[0_25px_50px_hsl(var(--primary))]
  return (
    <div className="pointer-events-none absolute left-0 right-0  _shadow-lg m-auto top-16 z-10 flex justify-center items-center _font-mono _font-bold">
      <Button
        tabIndex={0}
        variant={"outline"}
        title="Put Back"
        onClick={untrashFile}
        aria-label="Put Back From Trash"
        className="-translate-x-16 rounded-full block w-12 h-12 bg-sidebar text-sidebar-foreground/70 shadow-lg pointer-events-auto"
      >
        <Undo />
      </Button>
      <div className="border-2 w-64 h-12 flex justify-center items-center gap-2 translate-x-0 text-sidebar-foreground/70 bg-sidebar rounded-full">
        <Trash2 size={16} /> Trash
      </div>
      <Button
        title="Permanently Delete"
        variant={"outline"}
        onClick={removeFile}
        aria-label="Permanently Delete"
        className="shadow-lg border-2 rounded-full block w-12 h-12 bg-sidebar text-sidebar-foreground/70 translate-x-16 pointer-events-auto "
      >
        <Delete className="scale-125" />
      </Button>
    </div>
  );
};
