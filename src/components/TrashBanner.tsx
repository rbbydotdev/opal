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
    <div className="text-ring pointer-events-none absolute left-0 right-0  _shadow-lg m-auto top-16 z-10 flex justify-center items-center _font-mono _font-bold">
      <Button
        tabIndex={0}
        title="Put Back"
        onClick={untrashFile}
        aria-label="Put Back From Trash"
        className="transition-transform hover:scale-125 hover:text-ring hover:bg-transparent hover:backdrop-brightness-105 backdrop-brightness-95 -translate-x-16 rounded-full block w-12 h-12 bg-transparent backdrop-blur-sm text-sidebar-foreground/70 shadow-lg pointer-events-auto"
      >
        <Undo strokeWidth={3} />
      </Button>
      <div className="backdrop-brightness-95 font-bold text-ring w-64 h-12 flex justify-center items-center gap-2 translate-x-0 bg-transparent backdrop-blur-sm rounded-full">
        <Trash2 size={16} strokeWidth={3} /> Trash
      </div>
      <Button
        title="Permanently Delete"
        onClick={removeFile}
        aria-label="Permanently Delete"
        className="transition-transform backdrop-brightness-95 hover:scale-125 hover:text-ring hover:bg-transparent shadow-lg rounded-full block w-12 h-12 bg-transparent backdrop-blur-sm text-sidebar-foreground/70 translate-x-16 pointer-events-auto "
      >
        <Delete className="scale-125" strokeWidth={3} />
      </Button>
    </div>
  );
};
