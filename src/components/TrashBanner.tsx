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

  return (
    <div className=" w-[480px] text-sm text-ring pointer-events-none absolute left-0 right-0 m-auto top-16 z-50 flex justify-center items-center _font-mono _font-bold">
      <Button
        tabIndex={0}
        title="Put Back"
        onClick={untrashFile}
        aria-label="Put Back From Trash"
        className="border backdrop-blur-lg !bg-transparent _border-primary _!bg-primary-foreground absolute left-0 peer/putback transition-transform hover:scale-125 hover:text-ring rounded-full ock w-12 h-12 text-sidebar-foreground/70 shadow-lg pointer-events-auto"
      >
        <Undo strokeWidth={3} />
      </Button>
      <Button
        title="Permanently Delete"
        onClick={removeFile}
        aria-label="Permanently Delete"
        className="_!bg-primary-foreground backdrop-blur-lg !bg-transparent border _border-primary absolute right-0 peer/delete transition-transform  hover:scale-125 hover:text-ring shadow-lg rounded-full block w-12 h-12 text-sidebar-foreground/70 pointer-events-auto "
      >
        <Delete className="scale-125" strokeWidth={3} />
      </Button>
      <div
        data-putback="Put Back"
        data-delete="Delete"
        data-trash="Trash"
        className="
          border _border-primary
          shadow-lg
          transition-transform
          after:content-[attr(data-trash)]

          _bg-primary-foreground

          backdrop-blur-lg bg-transparent

          peer-hover/delete:after:content-[attr(data-delete)]
          peer-hover/putback:after:content-[attr(data-putback)]
          peer-hover/putback:-translate-x-12

          peer-hover/putback:scale-x-105
          peer-hover/delete:scale-x-105

          peer-hover/delete:translate-x-12
          peer-hover/putback:[&_.putback-icon]:flex
          peer-hover/delete:[&_.delete-icon]:flex

          peer-hover/putback:[&_.trash-icon]:hidden
          peer-hover/delete:[&_.trash-icon]:hidden


          peer-hover/delete:text-ring
          peer-hover/putback:text-ring

          font-bold
          text-sidebar-foreground/70
          w-64
          h-12
          flex
          justify-center
          items-center
          gap-2
          rounded-full
        "
      >
        <div className="items-center gap-2 justify-center trash-icon">
          <Trash2 size={16} strokeWidth={2} />
        </div>
        <div className="hidden items-center gap-2 justify-center delete-icon">
          <Delete size={16} strokeWidth={2} />
        </div>
        <div className="hidden items-center gap-2 justify-center putback-icon">
          <Undo size={16} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};
