import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useFileTreeClipboardEventListeners } from "@/components/SidebarFileMenu/hooks/useFileTreeClipboardEventListeners";
import { SidebarFileMenuFiles } from "@/components/SidebarFileMenu/shared/SidebarFileMenuFiles";
import { Button } from "@/components/ui/button";
import { FileTreeProvider, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { FilterInSpecialDirs, SpecialDirs } from "@/Db/SpecialDirs";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { absPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { CopyMinus, FileCode2Icon, FileEditIcon, FolderPlus, Trash2 } from "lucide-react";
import { useState } from "react";

const Banner = ({ currentWorkspace }: { currentWorkspace: Workspace }) => {
  const [dragEnter, setDragEnter] = useState(false);
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);

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
  return (
    <div
      className={cn(
        "cursor-pointer group/banner w-[calc(100%-2rem)] h-4 z-10 pl-2 border-dashed hover:border font-mono text-2xs flex justify-center items-center",
        { "border h-8": dragEnter }
      )}
      onDrop={(e) => handleDrop(e, RootNode)}
      onDragEnter={() => setDragEnter(true)}
      onDragLeave={() => setDragEnter(false)}
      onMouseLeave={() => setDragEnter(false)}
      onClick={handleClick}
      title={"File Tree Root"}
    >
      <span className={cn("group-hover/banner:block hidden", { block: dragEnter })}>root</span>
    </div>
  );
};
export function MainSidebarFileMenuFileSection({ className }: { className?: string }) {
  const { currentWorkspace } = useWorkspaceContext();
  const { focused } = useFileTreeMenuCtx();
  const { trashSelectedFiles, addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { setExpandAll, expandForNode } = useTreeExpanderContext();

  const { fileTreeDir } = useFileTree();

  useFileTreeClipboardEventListeners({ currentWorkspace });

  return (
    <FileTreeProvider currentWorkspace={currentWorkspace} filterOut={FilterInSpecialDirs}>
      <SidebarFileMenuFiles
        data-main-sidebar
        FileItemContextMenu={MainFileTreeContextMenu} // <MainFileTreeContextMenu ...
        title={"Files"}
        className={className}
        contentBanner={!fileTreeDir.isEmpty ? <Banner currentWorkspace={currentWorkspace} /> : null}
        filter={SpecialDirs.All} // Exclude trash and git directories etc
      >
        <span className="block group-data-[state=closed]/collapsible:hidden">
          <SidebarFileMenuFilesActions
            trashSelectedFiles={trashSelectedFiles}
            addFile={() => expandForNode(addDirFile("file", focused || absPath("/")), true)}
            addCssFile={() => expandForNode(addDirFile("file", focused || absPath("/"), "styles.css"), true)}
            addDir={() => expandForNode(addDirFile("dir", focused || absPath("/")), true)}
            setExpandAll={setExpandAll}
          />
        </span>
      </SidebarFileMenuFiles>
    </FileTreeProvider>
  );
}

export const SidebarFileMenuFilesActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  addCssFile,
  setExpandAll,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addCssFile?: () => void; // Optional for future use
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
}) => (
  <div className="whitespace-nowrap">
    <Button
      onClick={trashSelectedFiles}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="Trash Files"
      title="Trash Files"
    >
      <Trash2 />
    </Button>
    <Button
      onClick={addFile}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="New Markdown File"
      title="New Markdown File"
    >
      <FileEditIcon />
    </Button>
    <Button
      onClick={addCssFile}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="New Css File"
      title="New Css File"
    >
      <FileCode2Icon />
    </Button>
    <Button
      onClick={addDir}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      aria-label="Add Folder"
      title="New Folder"
    >
      <FolderPlus />
    </Button>
    <Button
      aria-label="Expand All"
      onDoubleClick={() => setExpandAll(true)}
      onClick={() => setExpandAll(false)}
      className="p-1 m-0 !bg-transparent"
      variant="ghost"
      title="Collapse All"
    >
      <CopyMinus />
    </Button>
  </div>
);
