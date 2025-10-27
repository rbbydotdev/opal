import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { absPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

export const RootFileMenuBanner = ({ currentWorkspace }: { currentWorkspace: Workspace }) => {
  const [dragEnter, setDragEnter] = useState(false);
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setFileTreeCtx } = useFileTreeMenuCtx();
  const handleClick = () => {
    setFileTreeCtx({
      anchorIndex: -1,
      editing: null,
      editType: null,
      focused: absPath("/"),
      virtual: null,
      selectedRange: [],
    });
  };
  const { handleDrop } = useFileTreeDragDrop({ currentWorkspace, onMoveMultiple: renameDirOrFileMultiple });

  const setDragEnterWithTimeout = (value: boolean) => {
    clearTimeout(timeoutRef.current!);
    if (value) {
      setDragEnter(true);
    } else {
      timeoutRef.current = setTimeout(() => setDragEnter(false), 1000);
    }
  };

  return (
    <MainFileTreeContextMenu fileNode={RootNode} currentWorkspace={currentWorkspace}>
      <div
        className={cn(
          "mb-[5px] visible cursor-pointer h-4 transition-all group/banner w-[calc(100%-2rem)] z-10 pl-2 border-dashed hover:border font-mono text-2xs flex justify-center items-center",
          { "border h-8 bg-sidebar scale-110 mt-1": dragEnter }
        )}
        onDrop={(e) => handleDrop(e, RootNode)}
        onDragEnter={() => setDragEnterWithTimeout(true)}
        onDragLeave={() => setDragEnterWithTimeout(false)}
        onMouseLeave={() => setDragEnterWithTimeout(false)}
        onClick={handleClick}
        title={"File Tree Root"}
      >
        <span className={cn("group-hover/banner:block hidden", { block: dragEnter })}>root</span>
      </div>
    </MainFileTreeContextMenu>
  );
};
