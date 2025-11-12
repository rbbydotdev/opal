import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { Workspace } from "@/data/Workspace";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useNodeResolver } from "@/hooks/useNodeResolver";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { FileTree } from "@/lib/FileTree/Filetree";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { ROOT_NODE, TreeDir, TreeFile } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

export const RootFileMenuBanner = ({
  currentWorkspace,
  fileTree,
  rootNode = ROOT_NODE,
}: {
  currentWorkspace: Workspace;
  fileTree?: FileTree;
  rootNode?: TreeDir | TreeFile | AbsPath;
}) => {
  const [dragEnter, setDragEnter] = useState(false);
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setFileTreeCtx, isDragging } = useFileTreeMenuCtx();
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
  const resolvedRootNode = useNodeResolver(fileTree ?? currentWorkspace.getFileTree(), rootNode);

  return (
    <MainFileTreeContextMenu fileNode={resolvedRootNode} currentWorkspace={currentWorkspace}>
      <div
        className={cn(
          "mb-[5px] visible cursor-pointer h-4 transition-all group/banner w-[calc(100%-2rem)] z-10 pl-2 border-dashed hover:border font-mono text-2xs flex justify-center items-center",
          { "border h-8 bg-sidebar scale-y-110 mt-1": dragEnter },
          { "invisible h-4": isDragging === false }
        )}
        onDrop={(e) => handleDrop(e, resolvedRootNode)}
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
